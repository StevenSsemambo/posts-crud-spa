// ---------------------------------------------------------------------------
// Global state (React Context + useState). No external state library.
//
// JSONPlaceholder accepts writes but never stores them. To make CRUD feel real,
// we keep an "overlay" of local changes per entity:
//   created: items added locally   edited: { id: changedFields }   deleted: [ids]
// The UI shows  serverData + overlay.  The overlay is saved to localStorage so
// changes survive a refresh.
//
// Every mutation is OPTIMISTIC: the UI updates immediately, the request runs in
// the background, and if it fails the change is rolled back with an error toast.
// ---------------------------------------------------------------------------
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import * as api from "./api.js";
import { useAuth } from "./auth.jsx";

const StoreContext = createContext(null);
export const useStore = () => useContext(StoreContext);

const KEYS = { posts: "crud:overlay:posts:v1", comments: "crud:overlay:comments:v1" };
const emptyOverlay = () => ({ created: [], edited: {}, deleted: [] });

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked (private mode): changes just will not survive a refresh */
  }
}

/** serverItems + overlay -> what the user should see (new items first). */
function applyOverlay(serverItems, overlay) {
  const deleted = new Set(overlay.deleted);
  const withEdits = (item) => (overlay.edited[item.id] ? { ...item, ...overlay.edited[item.id] } : item);
  return [...overlay.created, ...serverItems].filter((i) => !deleted.has(i.id)).map(withEdits);
}

/** Small helpers that change one overlay. Each has an "undo" counterpart for rollback. */
const overlayOps = (setOverlay) => ({
  add: (item) => setOverlay((o) => ({ ...o, created: [item, ...o.created] })),
  unadd: (id) => setOverlay((o) => ({ ...o, created: o.created.filter((i) => i.id !== id) })),
  edit: (id, data) => setOverlay((o) => ({ ...o, edited: { ...o.edited, [id]: { ...o.edited[id], ...data } } })),
  restoreEdit: (id, previous) =>
    setOverlay((o) => {
      const edited = { ...o.edited };
      if (previous) edited[id] = previous;
      else delete edited[id];
      return { ...o, edited };
    }),
  remove: (id) => setOverlay((o) => ({ ...o, deleted: [...o.deleted, id] })),
  restore: (id) => setOverlay((o) => ({ ...o, deleted: o.deleted.filter((x) => x !== id) })),
});

// Locally created items have string ids ("local-..."); the fake API does not know them.
const isRemote = (id) => typeof id === "number";

export function StoreProvider({ children }) {
  const { user, directory } = useAuth(); // who is logged in (null for guests)
  // Show last known data instantly (stale-while-revalidate), refresh in the background.
  const [serverPosts, setServerPosts] = useState(() => api.peek("posts"));
  const [users, setUsers] = useState(() => api.peek("users") || []);
  const [status, setStatus] = useState(() => (api.peek("posts") ? "ready" : "loading"));
  const [error, setError] = useState(null);

  const [serverComments, setServerComments] = useState({}); // postId -> comments[]
  const [commentStatus, setCommentStatus] = useState({}); // postId -> loading | ready | error

  const [postOverlay, setPostOverlay] = useState(() => readStorage(KEYS.posts, emptyOverlay()));
  const [commentOverlay, setCommentOverlay] = useState(() => readStorage(KEYS.comments, emptyOverlay()));
  const [toasts, setToasts] = useState([]);

  // Persist the overlays so local changes survive a refresh.
  useEffect(() => {
    writeStorage(KEYS.posts, postOverlay);
  }, [postOverlay]);
  useEffect(() => {
    writeStorage(KEYS.comments, commentOverlay);
  }, [commentOverlay]);

  // ---- Loading ----
  const load = useCallback(async () => {
    setError(null);
    if (!api.peek("posts")) setStatus("loading");
    try {
      const [posts, userList] = await Promise.all([api.getPosts(), api.getUsers()]);
      setServerPosts(posts);
      setUsers(userList);
      setStatus("ready");
    } catch (e) {
      setError(e.message);
      if (!api.peek("posts")) setStatus("error"); // if we have stale data, keep showing it
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const loadComments = useCallback(async (postId) => {
    if (!isRemote(postId)) {
      setCommentStatus((s) => ({ ...s, [postId]: "ready" })); // local posts have no server comments
      return;
    }
    const stale = api.peek(`comments:${postId}`);
    if (stale) setServerComments((s) => ({ ...s, [postId]: stale }));
    setCommentStatus((s) => ({ ...s, [postId]: stale ? "ready" : "loading" }));
    try {
      const data = await api.getComments(postId);
      setServerComments((s) => ({ ...s, [postId]: data }));
      setCommentStatus((s) => ({ ...s, [postId]: "ready" }));
    } catch {
      if (!stale) setCommentStatus((s) => ({ ...s, [postId]: "error" }));
    }
  }, []);

  // Hover prefetch: warm the cache only. No state changes, so hovering never re-renders the list.
  const prefetchComments = useCallback((postId) => {
    if (isRemote(postId)) api.getComments(postId).catch(() => {});
  }, []);

  // ---- Toasts ----
  const notify = useCallback((text, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ---- Derived data ----
  const posts = useMemo(() => (serverPosts ? applyOverlay(serverPosts, postOverlay) : []), [serverPosts, postOverlay]);
  // Post authors can be JSONPlaceholder users or accounts registered in this app.
  const authors = useMemo(() => [...users, ...directory], [users, directory]);
  const userName = (id) => authors.find((u) => u.id === id)?.name || `User ${id}`;

  const commentsFor = (postId) =>
    applyOverlay(serverComments[postId] || [], {
      ...commentOverlay,
      created: commentOverlay.created.filter((c) => c.postId === postId),
    });

  // ---- Optimistic mutation runner ----
  const run = useCallback(
    async ({ apply, undo, request, success, failure }) => {
      apply(); // 1. update the UI right away
      try {
        if (request) await request(); // 2. tell the server
        notify(success);
      } catch {
        undo(); // 3. server said no: roll back
        notify(failure, "error");
      }
    },
    [notify]
  );

  // The mutation functions below are created ONCE (useCallback with stable deps) and read the
  // newest overlays/user through this ref. Stable functions are what let React.memo on PostCard
  // actually skip re-renders: if they were new on every render, memo would never help.
  const latest = useRef({});
  latest.current = { postOverlay, commentOverlay, user };

  const postOps = useMemo(() => overlayOps(setPostOverlay), []);
  const commentOps = useMemo(() => overlayOps(setCommentOverlay), []);

  // Every write needs a logged-in user. The UI hides these actions from guests; this is the safety net.
  const requireUser = useCallback(() => {
    const current = latest.current.user;
    if (!current) notify("Please log in first.", "error");
    return current;
  }, [notify]);

  // ---- Posts CRUD ----
  const createPost = useCallback(
    (data) => {
      const author = requireUser();
      if (!author) return;
      const post = { id: `local-${Date.now()}`, userId: author.id, ...data };
      return run({
        apply: () => postOps.add(post),
        undo: () => postOps.unadd(post.id),
        request: () => api.createPost(post),
        success: "Post created",
        failure: "Could not create the post",
      });
    },
    [run, postOps, requireUser]
  );

  const updatePost = useCallback(
    (id, data) => {
      if (!requireUser()) return;
      const previous = latest.current.postOverlay.edited[id];
      return run({
        apply: () => postOps.edit(id, data),
        undo: () => postOps.restoreEdit(id, previous),
        request: isRemote(id) ? () => api.updatePost(id, { id, ...data }) : null,
        success: "Post updated",
        failure: "Could not update the post",
      });
    },
    [run, postOps, requireUser]
  );

  const deletePost = useCallback(
    (id) => {
      if (!requireUser()) return;
      return run({
        apply: () => postOps.remove(id),
        undo: () => postOps.restore(id),
        request: isRemote(id) ? () => api.deletePost(id) : null,
        success: "Post deleted",
        failure: "Could not delete the post",
      });
    },
    [run, postOps, requireUser]
  );

  // ---- Comments CRUD ----
  const createComment = useCallback(
    (postId, body) => {
      const author = requireUser();
      if (!author) return;
      const comment = { id: `local-c-${Date.now()}`, postId, name: author.name, email: author.email, body };
      return run({
        apply: () => commentOps.add(comment),
        undo: () => commentOps.unadd(comment.id),
        request: () => api.createComment(comment),
        success: "Comment added",
        failure: "Could not add the comment",
      });
    },
    [run, commentOps, requireUser]
  );

  const updateComment = useCallback(
    (id, body) => {
      if (!requireUser()) return;
      const previous = latest.current.commentOverlay.edited[id];
      return run({
        apply: () => commentOps.edit(id, { body }),
        undo: () => commentOps.restoreEdit(id, previous),
        request: isRemote(id) ? () => api.updateComment(id, { id, body }) : null,
        success: "Comment updated",
        failure: "Could not update the comment",
      });
    },
    [run, commentOps, requireUser]
  );

  const deleteComment = useCallback(
    (id) => {
      if (!requireUser()) return;
      return run({
        apply: () => commentOps.remove(id),
        undo: () => commentOps.restore(id),
        request: isRemote(id) ? () => api.deleteComment(id) : null,
        success: "Comment deleted",
        failure: "Could not delete the comment",
      });
    },
    [run, commentOps, requireUser]
  );

  const value = {
    posts, users, authors, status, error, reload: load,
    user, userName,
    commentsFor, commentStatus, loadComments, prefetchComments,
    createPost, updatePost, deletePost,
    createComment, updateComment, deleteComment,
    toasts,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}
