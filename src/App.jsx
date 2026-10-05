import { Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header.jsx";
import Toasts from "./components/Toasts.jsx";
import PostsPage from "./pages/PostsPage.jsx";
import PostPage from "./pages/PostPage.jsx";
import AuthPage from "./pages/AuthPage.jsx";

export default function App() {
  const location = useLocation();
  return (
    <>
      <Header />
      {/* key={pathname} remounts the wrapper on navigation so the fade-in animation replays */}
      <main className="container page" key={location.pathname}>
        <Routes>
          <Route path="/" element={<PostsPage />} />
          <Route path="/posts/:id" element={<PostPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="*" element={<p className="empty">Page not found.</p>} />
        </Routes>
      </main>
      <Toasts />
    </>
  );
}
