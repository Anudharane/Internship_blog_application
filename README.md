# BlogSpace — Frontend Blog Application

A fully functional, front-end-only blog platform built with plain HTML5, CSS3
and JavaScript. No frameworks, no build step, no backend — all data (users,
sessions, and blog posts) is stored in the browser's `localStorage` /
`sessionStorage`.

## Folder structure

```
blog-application/
│
├── index.html          Home page (hero, featured post, blog grid)
├── login.html           Log in
├── register.html        Register
├── dashboard.html        Logged-in user's dashboard
├── create-blog.html      Create / edit a blog post
├── post.html             Full single-post view (used by "Read more")
│
├── css/
│   └── style.css         All styling, design tokens, responsive rules
│
├── js/
│   └── script.js         All app logic (auth, blog CRUD, page rendering)
│
├── assets/
│   └── images/           (empty — sample posts use hosted placeholder images)
│
└── README.md
```

## 1. Running the project in VS Code

1. Unzip the project and open the `blog-application` folder in VS Code
   (`File → Open Folder…`).
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have
   it — search for "Live Server" in the Extensions panel.
3. Right-click `index.html` → **"Open with Live Server"**. It will open at
   something like `http://127.0.0.1:5500/index.html`.
4. That's it — no `npm install`, no build step. Every page works by opening
   the HTML file directly in a browser too, but Live Server gives you
   auto-refresh while you edit.

> Note: because everything runs on `localStorage`, data is scoped to the
> browser + origin you're using. Opening the file with `file://` directly
> instead of a local server also works — `localStorage` still functions,
> it's just tied to that specific way of opening the file.

## 2. How the pages communicate

There is **no server and no page-to-page messaging** — every page is a
normal, independent HTML file. What ties them together is:

- **One shared script** (`js/script.js`) is loaded on every page. It checks
  which page it's on by looking for a few unique element IDs (e.g. only
  `dashboard.html` has an element with id `dashUserName`), and only runs the
  logic relevant to that page.
- **`localStorage` / `sessionStorage` is the shared "database".** When you
  register on `register.html`, the new user is appended to the
  `blogspace_users` array in `localStorage`. When you log in on
  `login.html`, `script.js` checks that array, and if the credentials
  match, writes a small "session" object to storage. Every other page reads
  that same session object to know who (if anyone) is logged in.
- **Navigation is plain `<a href="...">` links and
  `window.location.href = "..."` redirects** — e.g. after a successful
  login, the script simply does `window.location.href = "dashboard.html"`.

## 3. How the LocalStorage "authentication" works

This is a front-end demo, so there's no real server-side authentication —
everything lives in three `localStorage` keys:

| Key | What it stores |
|---|---|
| `blogspace_users` | Array of every registered user: `{ id, fullName, email, password, createdAt }` |
| `blogspace_session` (or `sessionStorage` version) | The currently logged-in user: `{ id, fullName, email }` |
| `blogspace_blogs` | Array of every blog post from every user |

- **Register** checks `blogspace_users` for a matching email; if none
  exists, it pushes a new user object into the array.
- **Login** looks for a user whose email + password match, and if found,
  saves a trimmed-down "session" object.
  - If **Remember me** is checked, the session is saved to `localStorage`
    (survives closing the browser).
  - If unchecked, it's saved to `sessionStorage` instead (cleared when the
    tab/browser closes) — this is what makes the checkbox actually do
    something.
- **Protected pages** (`dashboard.html`, `create-blog.html`) call
  `requireAuth()` at the top of their init function, which redirects to
  `login.html` if no session is found.
- **Logout** simply clears the session keys and redirects to `login.html`.

⚠️ **Important security note:** passwords are stored in plain text in
`localStorage`. This is fine for a learning project because there's no real
backend, but it is **not** how you'd handle passwords in a real product
(you'd hash them server-side, never store them in the browser, and never
put them in localStorage). Feel free to mention this trade-off if asked
about it in your internship review — it shows you understand the
difference between a demo and production auth.

## 4. How to test the full flow

1. **Register** → go to `register.html`, fill in the form with a new email,
   submit. You'll see a success message, then get redirected to
   `login.html`.
   - Try registering the same email twice — you should see "An account
     with this email already exists."
2. **Login** → use the email/password you just registered (or the built-in
   demo account: `maya@blogspace.demo` / `Demo@1234`). You'll land on
   `dashboard.html`.
   - Try a wrong password — you should see "Invalid email or password."
3. **Dashboard** → you'll see your name, stats (0/0/0 for a new user), and
   an empty state prompting you to write your first blog.
4. **Create Blog** → click "Create new blog", fill in a title, category and
   content (image URL is optional), then:
   - Click **Publish** → redirects to dashboard, post shows status
     "published", and it now appears on the public **Home page**.
   - Or click **Save as draft** → post shows status "draft" and does *not*
     appear on the Home page.
5. **Edit** → on the dashboard, click the pencil icon on any of your posts
   — it opens `create-blog.html` pre-filled with that post's data. Change
   something and publish/save again.
6. **Delete** → click the trash icon — a confirmation modal appears; only
   confirming actually deletes the post.
7. **Refresh the browser** at any point — everything (your login, your
   posts) is still there, because it's all in `localStorage`.
8. **Logout** → click "Log out" in the sidebar or navbar — you're returned
   to `login.html`, and visiting `dashboard.html` directly now redirects
   you straight back to login.

## 5. Uploading the project to GitHub

From inside the `blog-application` folder in a terminal:

```bash
git init
git add .
git commit -m "Initial commit: BlogSpace blog application"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo-name>.git
git push -u origin main
```

If you don't have a repo yet: go to github.com → **New repository** → give
it a name (e.g. `blogspace-blog-app`) → **do not** initialize with a
README (you already have one) → create it, then copy the URL it gives you
into the `git remote add origin ...` command above.

**To make it viewable live (optional but nice for a portfolio):**
1. In your GitHub repo, go to **Settings → Pages**.
2. Under "Branch", pick `main` and `/root`, then **Save**.
3. GitHub will publish it at
   `https://<your-username>.github.io/<your-repo-name>/` within a minute or
   two.

## Notes on the sample data

On first load, `script.js` seeds one demo user (Maya Chen) and four
published sample posts so the Home page isn't empty. This only happens
once — if you clear your browser's site data (or use a fresh
browser/profile), the seed runs again.
