import { useState } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";
import { useStore } from "../store.jsx";

const EMAIL = /^\S+@\S+\.\S+$/;

// Label and error are siblings (not nested) so the input's accessible name stays just "Email",
// and the error is announced through aria-describedby instead.
function Field({ id, label, error, ...inputProps }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} aria-invalid={!!error} aria-describedby={error ? `${id}-error` : undefined} {...inputProps} />
      {error && <span id={`${id}-error`} className="error">{error}</span>}
    </div>
  );
}

// One page for both /login and /register; the `mode` prop switches the fields and the wording.
export default function AuthPage({ mode }) {
  const isRegister = mode === "register";
  const { user, login, register, loginDemo } = useAuth();
  const { users } = useStore();
  const location = useLocation();

  // Where to go after signing in. Guarded pages pass this in location.state.from.
  const requested = location.state?.from;
  const from = typeof requested === "string" && !/^\/(login|register)/.test(requested) ? requested : "/";

  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);

  // Already signed in (or just signed in): leave this page.
  if (user) return <Navigate to={from} replace />;

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const validate = () => {
    const found = {};
    if (isRegister && form.name.trim().length < 2) found.name = "Enter your name (at least 2 characters).";
    if (!EMAIL.test(form.email.trim())) found.email = "Enter a valid email address.";
    if (isRegister ? form.password.length < 6 : !form.password) {
      found.password = isRegister ? "Password must be at least 6 characters." : "Enter your password.";
    }
    return found;
  };

  const submit = async (e) => {
    e.preventDefault();
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    setBusy(true);
    try {
      await (isRegister ? register(form) : login(form));
      // On success `user` is set, so the next render redirects above.
    } catch (err) {
      setErrors({ form: err.message });
      setBusy(false);
    }
  };

  // Demo user = the first JSONPlaceholder user, so they already "own" posts 1-10.
  const demo = users.find((u) => u.id === 1) || { id: 1, name: "Demo User", email: "demo@example.com" };
  const switchTo = isRegister ? "/login" : "/register";

  return (
    <div className="auth-card">
      <h1>{isRegister ? "Create your account" : "Welcome back"}</h1>
      {requested && <p className="banner">Please log in to continue.</p>}

      <form onSubmit={submit} noValidate>
        {isRegister && (
          <Field id="auth-name" label="Name" value={form.name} onChange={set("name")} autoComplete="name" error={errors.name} />
        )}
        <Field id="auth-email" label="Email" type="email" value={form.email} onChange={set("email")} autoComplete="email" error={errors.email} />
        <Field
          id="auth-password"
          label="Password"
          type="password"
          value={form.password}
          onChange={set("password")}
          autoComplete={isRegister ? "new-password" : "current-password"}
          error={errors.password}
        />

        {errors.form && <p className="error" role="alert">{errors.form}</p>}

        <button className="btn primary" type="submit" disabled={busy}>
          {busy ? "Please wait…" : isRegister ? "Sign up" : "Log in"}
        </button>
      </form>

      <p className="muted switch">
        {isRegister ? "Already have an account? " : "New here? "}
        <Link to={switchTo} state={location.state}>{isRegister ? "Log in" : "Create an account"}</Link>
      </p>

      <div className="divider"><span>or</span></div>
      <button className="btn" type="button" onClick={() => loginDemo(demo)}>
        Continue as demo user ({demo.name})
      </button>
      <p className="muted fineprint">
        Demo authentication: accounts are stored in this browser only, because JSONPlaceholder has no login API.
      </p>
    </div>
  );
}
