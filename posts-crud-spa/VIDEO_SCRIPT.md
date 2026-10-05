# 5 minute walkthrough script (delete this file before submitting if you prefer)

Tip: share your screen with the code open, run `npm run dev` in another tab, and read through files in this order.
Say it in your own words; this is a guide, not something to read out. Rehearse once with a timer.

**0:00 Intro (15s).** This is a React single page app that does full CRUD on JSONPlaceholder, for posts and comments, with sign up and login. I will walk through the main files, then demo it.

**0:15 main.jsx (15s).** The app is wrapped in HashRouter, so it is a real SPA that works on any static host. Then AuthProvider, which knows who is logged in, and StoreProvider, which holds the data. The store sits inside auth because it needs the current user.

**0:30 api.js (55s).** BASE is the API address, TTL is ten minutes. `memory` is a Map used as the cache and `inflight` holds requests in progress. At startup I load the saved cache from localStorage so a reload shows data immediately. `peek` returns cached data even if old. `http` wraps fetch with an eight second timeout and one retry for GET. `cachedGet` checks the cache, shares an in-flight request if there is one, otherwise fetches and stores. This is what reduces latency. Below are the CRUD functions for posts and comments.

**1:25 auth.jsx (55s).** JSONPlaceholder has no login API, so accounts live in localStorage. Register creates a random salt and hashes salt plus password with SHA-256, so the password is never saved as plain text. Login hashes what was typed and compares. Wrong email and wrong password give the same message. Demo login signs in as a JSONPlaceholder user. The session is saved so a refresh keeps you logged in, and logout clears it. I want to be clear this is a demo of the flow, not real security, because a real login needs a server.

**2:20 store.jsx (80s).** JSONPlaceholder does not actually save changes, so I keep an overlay: created, edited, deleted. `applyOverlay` merges server data with the overlay, and the overlay is saved to localStorage. State starts from `peek`, so the UI paints instantly, then `load` refreshes in the background. `run` is the optimistic update: apply the change, send the request, and if it fails, undo and show an error toast. createPost, updatePost and deletePost each give `run` an apply, an undo and a request. They are created once with useCallback and read the latest state through a ref, so their identity never changes. Each one first checks there is a logged-in user. Local items have string ids and skip the network.

**3:40 PostsPage.jsx (45s).** Page, search, author and page size are read from the URL, so views are shareable. I fetch the 100 posts once, cache them, and paginate in the browser, which makes search instant. `useDeferredValue` keeps typing smooth and `useMemo` filters only when inputs change. PostCard is wrapped in `memo`, and it works because its props are stable: the callbacks never change and unedited posts keep their identity. Hovering a card only warms the comments cache. Guests do not see Edit or Delete, and New post sends them to login and back.

**4:25 AuthPage and other files (20s).** AuthPage is one form for both login and sign up, with validation and accessible error messages. Pagination builds a compact page list, PostForm is a validated modal, Comments handles add, edit and delete, and styles.css has the responsive grid, dark mode and animations.

**4:45 Demo (15s).** Sign up, create a post, edit it, delete one, open a post and add a comment, then log out. Thank you.
