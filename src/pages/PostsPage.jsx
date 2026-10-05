import { memo, useCallback, useDeferredValue, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import Pagination from "../components/Pagination.jsx";
import PostForm from "../components/PostForm.jsx";

// memo: a card re-renders only when one of its props changes. That works because every prop is
// stable: `post` keeps its object identity unless it was edited, and the callbacks are created once.
const PostCard = memo(function PostCard({ post, author, index, canEdit, onEdit, onDelete, onHover }) {
  return (
    <article className="card" style={{ animationDelay: `${index * 40}ms` }}>
      <Link to={`/posts/${post.id}`} className="card-link" onMouseEnter={() => onHover(post.id)}>
        <h3>{post.title}</h3>
        <p>{post.body}</p>
      </Link>
      <div className="card-foot">
        <span className="muted">by {author}</span>
        {canEdit && (
          <div className="actions">
            <button className="btn small" onClick={() => onEdit(post)}>Edit</button>
            <button className="btn small danger" onClick={() => onDelete(post)}>Delete</button>
          </div>
        )}
      </div>
    </article>
  );
});

export default function PostsPage() {
  const { posts, authors, status, error, reload, userName, user, createPost, updatePost, deletePost, prefetchComments } = useStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [form, setForm] = useState(null); // null | { mode: "new" } | { mode: "edit", post }

  // Page, search, author filter and page size live in the URL, so views are shareable and survive refresh.
  const page = Math.max(1, Number(params.get("page")) || 1);
  const q = params.get("q") || "";
  const author = params.get("author") || "";
  const size = Math.min(100, Math.max(1, Number(params.get("size")) || 9));

  const setParam = (changes) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(changes).forEach(([k, v]) => (v ? next.set(k, v) : next.delete(k)));
        return next;
      },
      { replace: true }
    );

  // useDeferredValue keeps typing responsive while the filtered list recomputes.
  const deferredQ = useDeferredValue(q);

  const filtered = useMemo(() => {
    const term = deferredQ.trim().toLowerCase();
    return posts.filter(
      (p) =>
        (!author || String(p.userId) === author) &&
        (!term || p.title.toLowerCase().includes(term) || p.body.toLowerCase().includes(term))
    );
  }, [posts, deferredQ, author]);

  const pages = Math.max(1, Math.ceil(filtered.length / size));
  const current = Math.min(page, pages);
  const visible = filtered.slice((current - 1) * size, current * size);

  // Stable callbacks (see PostCard): setForm and deletePost never change identity.
  const handleEdit = useCallback((post) => setForm({ mode: "edit", post }), []);
  const handleDelete = useCallback(
    (post) => {
      if (window.confirm(`Delete "${post.title}"?`)) deletePost(post.id);
    },
    [deletePost]
  );

  // Guests are sent to the login page and come straight back here afterwards.
  const startNew = () => {
    if (user) setForm({ mode: "new" });
    else navigate("/login", { state: { from: location.pathname + location.search } });
  };

  return (
    <>
      <div className="toolbar">
        <input
          className="search"
          type="search"
          placeholder="Search posts…"
          value={q}
          onChange={(e) => setParam({ q: e.target.value, page: "" })}
          aria-label="Search posts"
        />
        <select value={author} onChange={(e) => setParam({ author: e.target.value, page: "" })} aria-label="Filter by author">
          <option value="">All authors</option>
          {authors.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
        <select value={size} onChange={(e) => setParam({ size: e.target.value, page: "" })} aria-label="Posts per page">
          {[6, 9, 12, 24].map((n) => (
            <option key={n} value={n}>{n} / page</option>
          ))}
        </select>
        <button className="btn primary" onClick={startNew}>+ New post</button>
      </div>

      {error && status === "ready" && (
        <p className="banner">Showing saved data (offline?). <button className="link" onClick={reload}>Refresh</button></p>
      )}

      {status === "loading" && (
        <div className="grid">
          {Array.from({ length: 6 }, (_, i) => <div key={i} className="card skeleton tall" />)}
        </div>
      )}

      {status === "error" && (
        <div className="empty">
          <p>Could not load posts: {error}</p>
          <button className="btn primary" onClick={reload}>Try again</button>
        </div>
      )}

      {status === "ready" && (
        <>
          <p className="muted count">{filtered.length} post{filtered.length === 1 ? "" : "s"}</p>
          {visible.length === 0 ? (
            <p className="empty">No posts match your search.</p>
          ) : (
            <div className="grid">
              {visible.map((p, i) => (
                <PostCard
                  key={p.id}
                  post={p}
                  index={i}
                  author={userName(p.userId)}
                  canEdit={!!user}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onHover={prefetchComments} /* warm the cache so the detail page opens instantly */
                />
              ))}
            </div>
          )}
          <Pagination page={current} pages={pages} onChange={(p) => { setParam({ page: p === 1 ? "" : String(p) }); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
        </>
      )}

      {form?.mode === "new" && (
        <PostForm heading="New post" onSubmit={createPost} onClose={() => setForm(null)} />
      )}
      {form?.mode === "edit" && (
        <PostForm
          heading="Edit post"
          initial={form.post}
          onSubmit={(data) => updatePost(form.post.id, data)}
          onClose={() => setForm(null)}
        />
      )}
    </>
  );
}
