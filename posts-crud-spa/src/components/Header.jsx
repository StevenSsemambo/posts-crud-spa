import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Header() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const onAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <header className="header">
      <div className="container header-inner">
        <Link to="/" className="logo">📝 Posts CRUD</Link>
        {user ? (
          <div className="user-menu">
            <span className="user-name" title={user.email}>👤 {user.name}</span>
            <button className="btn small" onClick={logout}>Log out</button>
          </div>
        ) : (
          !onAuthPage && (
            <div className="user-menu">
              <Link className="btn small" to="/login">Log in</Link>
              <Link className="btn small primary" to="/register">Sign up</Link>
            </div>
          )
        )}
      </div>
    </header>
  );
}
