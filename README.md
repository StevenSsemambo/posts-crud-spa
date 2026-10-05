# Posts CRUD SPA (React + JSONPlaceholder)

A single page app that performs full CRUD against the [JSONPlaceholder](https://jsonplaceholder.typicode.com) fake API,
with sign up / log in, comments, caching and optimistic updates.

## Video walkthrough

**Video URL:** `PASTE_YOUR_PUBLIC_VIDEO_LINK_HERE`

## Run it

```bash
npm install
npm run dev      # development
npm run build    # production build in /dist
npm run preview  # serve the production build
```

**Quick start for reviewers:** open the app, click **Log in**, then **Continue as demo user** (one click, no password).
Anyone can browse; creating, editing and deleting needs a logged-in user.

## Features

| Area | What was done |
|---|---|
| CRUD | Posts: create, read (list + detail), update, delete. Comments: add, read, edit, delete. |
| Authentication | Sign up, log in, log out, one-click demo login, session kept across refreshes, guests are read-only (see below). |
| Design and responsiveness | CSS grid that reflows from 1 to many columns, sticky header, mobile-friendly toolbar, modal and login card, automatic dark mode. |
| State management | React Context + `useState` (no external library). Overlay model keeps local changes on top of server data. |
| Reactivity | Optimistic updates: the UI changes instantly and rolls back with an error toast if the request fails. |
| Pagination and optimization | Client-side pagination (page, search, author, page size stored in the URL), compact page numbers, `memo` with stable callbacks, `useMemo`, `useDeferredValue`. |
| Caching and latency | In-memory + localStorage cache, 10 minute TTL, de-duplicated in-flight requests, stale-while-revalidate on load, comment prefetch on card hover, 8 s timeout and one retry on GET. |
| Extras | Comments, search and filter, skeleton loaders, transitions and animations, toasts, reduced-motion support. |

## How it works

JSONPlaceholder accepts POST/PUT/DELETE but does not store them. The app therefore keeps an **overlay** of local changes
(`created`, `edited`, `deleted`) on top of the server data and saves it to `localStorage`, so changes survive a refresh.
Items created locally get string ids (`local-...`), and requests for those are skipped because the fake API does not know them.

### Pagination choice

The 100 posts are fetched once, cached, and paginated in the browser. This makes search and the author filter instant and
avoids a network request per page. (The API also supports `_page` and `_limit` if server-side paging were needed for a much larger dataset.)

### Authentication

JSONPlaceholder has no login endpoints, so authentication is implemented **in the browser** (`src/auth.jsx`):

- **Sign up** stores an account in `localStorage`. The password is salted and hashed (SHA-256) first, never saved as plain text.
- **Log in** hashes the typed password and compares. Wrong email and wrong password give the same message.
- **Demo login** signs in as JSONPlaceholder user 1 with no password.
- **Session** is saved so a refresh keeps you logged in; **Log out** clears it.
- **Guests** can browse and read comments. Edit/Delete buttons and the comment form are hidden for them, and **+ New post** redirects to the
  login page and returns them afterwards. The store also refuses write calls without a user, as a safety net.
- New posts and comments are authored by the logged-in user, and registered accounts appear in the author filter.

> **This is a demo of the app flow, not real security.** Anyone with access to the browser can read `localStorage`.
> Real authentication needs a server that verifies credentials and issues sessions.

### Why `memo` works here

`PostCard` is wrapped in `React.memo`, which only helps if its props are stable. The post objects keep their identity unless edited,
and `onEdit`, `onDelete` and `onHover` are created once (`useCallback`; the store's mutation functions read the latest state through a ref).
The hover prefetch only warms the cache and changes no React state. I measured it: hovering cards and typing in the search box cause
no card re-renders, and editing one post re-renders only that card.

## Structure

```
src/
  api.js            fetch wrapper, cache, all API calls
  auth.jsx          sign up / log in / demo login / logout, session
  store.jsx         global state, overlay, optimistic mutations, toasts
  App.jsx           routes
  pages/            PostsPage (list, filters, pagination), PostPage (detail), AuthPage (login + sign up)
  components/       Header, Pagination, PostForm, Comments, Toasts
  styles.css        design, responsiveness, animations
```
