// ---------------------------------------------------------------------------
// Authentication (client-side demo).
//
// JSONPlaceholder has no login endpoints, so accounts live in localStorage.
//   - Register: name + email + password. The password is salted and hashed
//     (SHA-256) before it is saved, never stored as plain text.
//   - Login: re-hash the typed password and compare.
//   - Demo login: one click, signs in as a JSONPlaceholder user (no password).
//   - Session: the signed-in user is saved so a refresh keeps you logged in.
//
// IMPORTANT: this shows the app flow (guards, session, logout). It is NOT real
// security: anyone with access to the browser can read localStorage. Real
// authentication needs a server.
// ---------------------------------------------------------------------------
import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

const KEYS = { accounts: "crud:accounts:v1", session: "crud:session:v1" };
const FIRST_ACCOUNT_ID = 100; // JSONPlaceholder users are 1-10, so ours never collide

function read(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage full or blocked: the session just will not survive a refresh */
  }
}

const toHex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
const newSalt = () => toHex(crypto.getRandomValues(new Uint8Array(16)));

async function hashPassword(password, salt) {
  const text = salt + password;
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return toHex(new Uint8Array(digest));
  }
  // crypto.subtle only exists on https or localhost. On plain http (for example a phone
  // opening the dev server by LAN address) fall back to a simple hash so the demo still works.
  let h = 5381;
  for (const ch of text) h = (h * 33) ^ ch.charCodeAt(0);
  return `weak-${h >>> 0}`;
}

// Only accept a saved session or account that has the shape we expect.
const isUser = (u) => u && typeof u === "object" && u.id != null && typeof u.name === "string" && typeof u.email === "string";
const publicUser = ({ id, name, email }) => ({ id, name, email });

export function AuthProvider({ children }) {
  const [accounts, setAccounts] = useState(() => read(KEYS.accounts, []).filter(isUser));
  const [user, setUser] = useState(() => {
    const saved = read(KEYS.session, null);
    return isUser(saved) ? publicUser(saved) : null;
  });

  const startSession = useCallback((account) => {
    const session = publicUser(account);
    setUser(session);
    write(KEYS.session, session);
  }, []);

  // Storage is the source of truth, so these callbacks never act on a stale copy.
  const register = useCallback(
    async ({ name, email, password }) => {
      const cleanEmail = email.trim().toLowerCase();
      const existing = read(KEYS.accounts, []).filter(isUser);
      if (existing.some((a) => a.email === cleanEmail)) {
        throw new Error("An account with this email already exists. Try logging in.");
      }
      const salt = newSalt();
      const account = {
        id: Math.max(FIRST_ACCOUNT_ID - 1, ...existing.map((a) => Number(a.id) || 0)) + 1,
        name: name.trim(),
        email: cleanEmail,
        salt,
        hash: await hashPassword(password, salt),
      };
      const next = [...existing, account];
      write(KEYS.accounts, next);
      setAccounts(next);
      startSession(account);
    },
    [startSession]
  );

  const login = useCallback(
    async ({ email, password }) => {
      const account = read(KEYS.accounts, []).find((a) => isUser(a) && a.email === email.trim().toLowerCase());
      const hash = account ? await hashPassword(password, account.salt) : null;
      // Same message for "no such user" and "wrong password" so the form does not reveal which emails exist.
      if (!account || hash !== account.hash) throw new Error("Incorrect email or password.");
      startSession(account);
    },
    [startSession]
  );

  const loginDemo = useCallback((profile) => startSession(profile), [startSession]);

  const logout = useCallback(() => {
    setUser(null);
    try {
      localStorage.removeItem(KEYS.session);
    } catch {
      /* ignore */
    }
  }, []);

  // Safe-to-share list (no salts or hashes) so the UI can show account names as post authors.
  const directory = useMemo(() => accounts.map(publicUser), [accounts]);

  const value = useMemo(
    () => ({ user, directory, register, login, loginDemo, logout }),
    [user, directory, register, login, loginDemo, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
