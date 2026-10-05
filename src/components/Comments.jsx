import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useStore } from "../store.jsx";

function CommentItem({ comment }) {
  const { updateComment, deleteComment, user } = useStore();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(comment.body);

  const save = () => {
    if (text.trim().length < 2) return;
    updateComment(comment.id, text.trim());
    setEditing(false);
  };

  return (
    <li className="comment">
      <div className="comment-head">
        <strong>{comment.name}</strong>
        <span className="muted">{comment.email}</span>
      </div>
      {editing ? (
        <>
          <textarea rows="3" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="actions left">
            <button className="btn small primary" onClick={save}>Save</button>
            <button className="btn small" onClick={() => { setEditing(false); setText(comment.body); }}>Cancel</button>
          </div>
        </>
      ) : (
        <>
          <p>{comment.body}</p>
          {user && (
            <div className="actions left">
              <button className="btn small" onClick={() => setEditing(true)}>Edit</button>
              <button className="btn small danger" onClick={() => deleteComment(comment.id)}>Delete</button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

export default function Comments({ postId }) {
  const { commentsFor, commentStatus, loadComments, createComment, user } = useStore();
  const [draft, setDraft] = useState("");
  const location = useLocation();

  useEffect(() => {
    loadComments(postId);
  }, [postId, loadComments]);

  const status = commentStatus[postId] || "loading";
  const comments = commentsFor(postId);

  const submit = (e) => {
    e.preventDefault();
    if (draft.trim().length < 2) return;
    createComment(postId, draft.trim());
    setDraft("");
  };

  return (
    <section className="comments" aria-labelledby="comments-title">
      <h2 id="comments-title">Comments ({comments.length})</h2>

      {user ? (
        <form className="comment-form" onSubmit={submit}>
          <textarea
            rows="3"
            placeholder={`Comment as ${user.name}…`}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button className="btn primary" type="submit" disabled={draft.trim().length < 2}>Add comment</button>
        </form>
      ) : (
        <p className="muted login-prompt">
          <Link to="/login" state={{ from: location.pathname + location.search }}>Log in</Link> to leave a comment.
        </p>
      )}

      {status === "loading" && <div className="skeleton line" />}
      {status === "error" && (
        <p className="error">
          Could not load comments. <button className="link" onClick={() => loadComments(postId)}>Retry</button>
        </p>
      )}
      <ul className="comment-list">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </ul>
      {status === "ready" && comments.length === 0 && <p className="empty">No comments yet. Be the first.</p>}
    </section>
  );
}
