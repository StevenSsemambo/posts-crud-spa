import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useStore } from "../store.jsx";
import Comments from "../components/Comments.jsx";
import PostForm from "../components/PostForm.jsx";

export default function PostPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { posts, status, userName, user, updatePost, deletePost } = useStore();
  const [editing, setEditing] = useState(false);

  // Server posts have numeric ids, locally created ones have string ids.
  const postId = /^\d+$/.test(id) ? Number(id) : id;
  const post = posts.find((p) => p.id === postId);

  if (status === "loading") return <div className="card skeleton tall" />;
  if (!post) {
    return (
      <div className="empty">
        <p>This post does not exist (it may have been deleted).</p>
        <Link to="/" className="btn primary">Back to posts</Link>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm("Delete this post?")) {
      deletePost(post.id);
      navigate("/");
    }
  };

  return (
    <>
      <Link to="/" className="back">← All posts</Link>
      <article className="detail">
        <h1>{post.title}</h1>
        <p className="muted">by {userName(post.userId)}</p>
        <p className="detail-body">{post.body}</p>
        {user && (
          <div className="actions left">
            <button className="btn" onClick={() => setEditing(true)}>Edit</button>
            <button className="btn danger" onClick={handleDelete}>Delete</button>
          </div>
        )}
      </article>

      <Comments postId={post.id} />

      {editing && (
        <PostForm
          heading="Edit post"
          initial={post}
          onSubmit={(data) => updatePost(post.id, data)}
          onClose={() => setEditing(false)}
        />
      )}
    </>
  );
}
