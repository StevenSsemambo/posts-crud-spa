import { useEffect, useRef, useState } from "react";

// Modal form used for both "new post" and "edit post".
export default function PostForm({ heading, initial, onSubmit, onClose }) {
  const [title, setTitle] = useState(initial?.title || "");
  const [body, setBody] = useState(initial?.body || "");
  const [errors, setErrors] = useState({});
  const titleRef = useRef(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const submit = (e) => {
    e.preventDefault();
    const next = {};
    if (title.trim().length < 3) next.title = "Title must be at least 3 characters.";
    if (body.trim().length < 5) next.body = "Body must be at least 5 characters.";
    setErrors(next);
    if (Object.keys(next).length) return;
    onSubmit({ title: title.trim(), body: body.trim() });
    onClose();
  };

  return (
    <div className="backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label={heading} noValidate>
        <h2>{heading}</h2>
        <label>
          Title
          <input ref={titleRef} value={title} onChange={(e) => setTitle(e.target.value)} />
          {errors.title && <span className="error">{errors.title}</span>}
        </label>
        <label>
          Body
          <textarea rows="6" value={body} onChange={(e) => setBody(e.target.value)} />
          {errors.body && <span className="error">{errors.body}</span>}
        </label>
        <div className="actions">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn primary">Save</button>
        </div>
      </form>
    </div>
  );
}
