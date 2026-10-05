// ---------------------------------------------------------------------------
// API layer: talks to JSONPlaceholder and caches GET responses.
//
// Caching strategy
//  1. In-memory Map, so repeat requests in a session are instant.
//  2. Mirrored to localStorage, so a page reload can render immediately
//     from the last known data while fresh data loads (stale-while-revalidate).
//  3. TTL: entries older than 10 minutes are refetched.
//  4. In-flight de-duplication: two callers asking for the same key share one request.
// ---------------------------------------------------------------------------
const BASE = "https://jsonplaceholder.typicode.com";
const TTL = 10 * 60 * 1000;
const LS_KEY = "crud:cache:v1";

const memory = new Map(); // key -> { data, time }
const inflight = new Map(); // key -> Promise

// Hydrate the in-memory cache from localStorage once, at startup.
try {
  const saved = JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  Object.entries(saved).forEach(([key, value]) => memory.set(key, value));
} catch {
  /* ignore corrupt or unavailable storage */
}

function persist() {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch {
    /* storage full or blocked: caching still works in memory */
  }
}

/** Returns cached data for a key even if it is stale, or null. Used for instant first paint. */
export function peek(key) {
  return memory.get(key)?.data ?? null;
}

/** fetch wrapper: JSON headers, 8s timeout, one automatic retry for GET requests. */
async function http(path, options = {}, retries = 1) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  const method = options.method || "GET";
  try {
    const res = await fetch(BASE + path, {
      ...options,
      signal: controller.signal,
      headers: { "Content-Type": "application/json; charset=UTF-8" },
    });
    if (!res.ok) throw new Error(`Request failed (${res.status})`);
    return await res.json();
  } catch (err) {
    if (retries > 0 && method === "GET") return http(path, options, retries - 1);
    throw err.name === "AbortError" ? new Error("Request timed out") : err;
  } finally {
    clearTimeout(timer);
  }
}

/** GET with caching + request de-duplication. */
function cachedGet(key, path) {
  const hit = memory.get(key);
  if (hit && Date.now() - hit.time < TTL) return Promise.resolve(hit.data);
  if (inflight.has(key)) return inflight.get(key);

  const request = http(path)
    .then((data) => {
      memory.set(key, { data, time: Date.now() });
      persist();
      return data;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

const send = (path, method, body) =>
  http(path, { method, body: body ? JSON.stringify(body) : undefined });

// ---- Read ----
export const getPosts = () => cachedGet("posts", "/posts");
export const getUsers = () => cachedGet("users", "/users");
export const getComments = (postId) => cachedGet(`comments:${postId}`, `/posts/${postId}/comments`);
export const getPost = (id) => cachedGet(`post:${id}`, `/posts/${id}`);

// ---- Create / Update / Delete (JSONPlaceholder fakes persistence, so the app layers local state on top) ----
export const createPost = (data) => send("/posts", "POST", data);
export const updatePost = (id, data) => send(`/posts/${id}`, "PUT", data);
export const deletePost = (id) => send(`/posts/${id}`, "DELETE");

export const createComment = (data) => send("/comments", "POST", data);
export const updateComment = (id, data) => send(`/comments/${id}`, "PUT", data);
export const deleteComment = (id) => send(`/comments/${id}`, "DELETE");
