/* =========================================================
   BlogSpace — script.js
   All app logic lives in this one file and is shared by every
   page. Each page only has a few DOM elements with specific
   IDs, so the functions below check "does this element exist
   on this page?" before doing anything — that's how one file
   can safely run on five different pages.

   LOCALSTORAGE KEYS
   - "blogspace_users"   -> array of registered users
   - "blogspace_session" -> the currently logged-in user (or null)
   - "blogspace_blogs"   -> array of every blog post (all users)
   ========================================================= */

const STORAGE_KEYS = {
  USERS: "blogspace_users",
  SESSION: "blogspace_session",
  BLOGS: "blogspace_blogs",
};

/* =========================================================
   SECTION 1: LOW-LEVEL STORAGE HELPERS
   Small wrappers around localStorage so the rest of the code
   never has to call JSON.parse/JSON.stringify directly.
   ========================================================= */

function readList(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch (err) {
    console.error(`Could not read "${key}" from localStorage`, err);
    return [];
  }
}

function writeList(key, list) {
  localStorage.setItem(key, JSON.stringify(list));
}

/**
 * Session lives in localStorage when "Remember me" was checked
 * (survives closing the browser), otherwise in sessionStorage
 * (cleared when the tab/browser closes). readSession checks both
 * so it doesn't matter which one a page was loaded from.
 */
function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION) || sessionStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

function writeSession(user, remember) {
  const json = JSON.stringify(user);
  if (remember) {
    localStorage.setItem(STORAGE_KEYS.SESSION, json);
    sessionStorage.removeItem(STORAGE_KEYS.SESSION);
  } else {
    sessionStorage.setItem(STORAGE_KEYS.SESSION, json);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

/* =========================================================
   SECTION 2: SAMPLE DATA (first-run seed)
   Runs once. If "blogspace_blogs" has never been created, we
   drop in a demo author + a handful of published posts so the
   Home page has something to show on first launch.
   ========================================================= */

function seedSampleData() {
  const usersExist = localStorage.getItem(STORAGE_KEYS.USERS);
  const blogsExist = localStorage.getItem(STORAGE_KEYS.BLOGS);

  if (!usersExist) {
    const demoUser = {
      id: "user_demo_1",
      fullName: "Maya Chen",
      email: "maya@blogspace.demo",
      password: "Demo@1234", // plain text on purpose — see README note on this
      createdAt: new Date().toISOString(),
    };
    writeList(STORAGE_KEYS.USERS, [demoUser]);
  }

  if (!blogsExist) {
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;
    const sampleBlogs = [
      {
        id: "blog_seed_1",
        title: "Designing Interfaces People Actually Enjoy Using",
        category: "Design",
        image: "https://picsum.photos/seed/blogspace1/800/500",
        content:
          "Good interface design is mostly invisible — it disappears into the task at hand. In this post we walk through a handful of principles that separate interfaces people tolerate from interfaces people genuinely enjoy: clear feedback, forgiving forms, and typography that carries meaning rather than just filling space. We also look at small, unglamorous details like focus states and empty-state messaging, which quietly do more for trust than any hero animation.",
        authorId: "user_demo_1",
        authorName: "Maya Chen",
        status: "published",
        createdAt: new Date(now - day * 6).toISOString(),
      },
      {
        id: "blog_seed_2",
        title: "A Beginner's Guide to LocalStorage in JavaScript",
        category: "Development",
        image: "https://picsum.photos/seed/blogspace2/800/500",
        content:
          "LocalStorage is one of the simplest ways to persist data in the browser without a backend. In this guide we cover how to save, read, update and delete data with plain JavaScript, why everything is stored as a string, and common pitfalls like forgetting to JSON.stringify an object before saving it. By the end you'll be comfortable using LocalStorage to power small projects like this very blog application.",
        authorId: "user_demo_1",
        authorName: "Maya Chen",
        status: "published",
        createdAt: new Date(now - day * 4).toISOString(),
      },
      {
        id: "blog_seed_3",
        title: "Why Slow Mornings Make for Better Writing",
        category: "Lifestyle",
        image: "https://picsum.photos/seed/blogspace3/800/500",
        content:
          "There's a strange myth that good writing requires hustle. In practice, some of the clearest thinking happens in unhurried mornings — before notifications start competing for attention. This post is a short reflection on building a slower morning routine, and how that spare, quiet time tends to show up in the quality of what gets written later in the day.",
        authorId: "user_demo_1",
        authorName: "Maya Chen",
        status: "published",
        createdAt: new Date(now - day * 2).toISOString(),
      },
      {
        id: "blog_seed_4",
        title: "Understanding Client-Side Form Validation",
        category: "Development",
        image: "https://picsum.photos/seed/blogspace4/800/500",
        content:
          "Client-side validation is the first line of defence against bad data, and it's also what makes a form feel responsive and considerate rather than punishing. We break down how to validate required fields, emails and matching passwords using plain JavaScript, and how to surface errors in a way that helps rather than scolds the person filling out the form.",
        authorId: "user_demo_1",
        authorName: "Maya Chen",
        status: "published",
        createdAt: new Date(now - day * 1).toISOString(),
      },
    ];
    writeList(STORAGE_KEYS.BLOGS, sampleBlogs);
  }
}

/* =========================================================
   SECTION 3: SMALL UTILITIES
   ========================================================= */

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(isoString) {
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function makeExcerpt(text, maxLen = 130) {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen).trim() + "…" : clean;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** Reusable bottom-right toast for success/error feedback. */
function showToast(message, type = "success") {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    document.body.appendChild(toast);
  }
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  // Force reflow so the transition re-triggers on repeated calls
  void toast.offsetWidth;
  toast.classList.add("show");
  clearTimeout(toast._hideTimer);
  toast._hideTimer = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setFieldError(fieldEl, message) {
  fieldEl.classList.add("has-error");
  const errEl = fieldEl.querySelector(".field-error");
  if (errEl) errEl.textContent = message;
}

function clearFieldError(fieldEl) {
  fieldEl.classList.remove("has-error");
}

function showAlert(alertEl, message, type = "error") {
  if (!alertEl) return;
  alertEl.textContent = message;
  alertEl.className = `alert alert-${type} show`;
}

function hideAlert(alertEl) {
  if (!alertEl) return;
  alertEl.classList.remove("show");
}

/* =========================================================
   SECTION 4: AUTHENTICATION
   ========================================================= */

function getCurrentUser() {
  return readSession();
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Protects a page: if nobody is logged in, bounce to login.html.
 * Call this at the top of any page that requires auth.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

function registerUser({ fullName, email, password }) {
  const users = readList(STORAGE_KEYS.USERS);
  const emailTaken = users.some(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
  if (emailTaken) {
    return { success: false, message: "An account with this email already exists." };
  }

  const newUser = {
    id: generateId("user"),
    fullName,
    email,
    password, // NOTE: plain text — fine for a LocalStorage demo, never in production
    createdAt: new Date().toISOString(),
  };
  users.push(newUser);
  writeList(STORAGE_KEYS.USERS, users);
  return { success: true, user: newUser };
}

function loginUser({ email, password, remember = false }) {
  const users = readList(STORAGE_KEYS.USERS);
  const match = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password
  );
  if (!match) {
    return { success: false, message: "Invalid email or password." };
  }
  const sessionUser = { id: match.id, fullName: match.fullName, email: match.email };
  writeSession(sessionUser, remember);
  return { success: true, user: sessionUser };
}

function logoutUser() {
  clearSession();
  window.location.href = "login.html";
}

/* =========================================================
   SECTION 5: BLOG CRUD
   ========================================================= */

function getAllBlogs() {
  return readList(STORAGE_KEYS.BLOGS);
}

function getPublishedBlogs() {
  return getAllBlogs()
    .filter((b) => b.status === "published")
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getBlogsByUser(userId) {
  return getAllBlogs()
    .filter((b) => b.authorId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function getBlogById(id) {
  return getAllBlogs().find((b) => b.id === id) || null;
}

function createBlog({ title, category, image, content, status, authorId, authorName }) {
  const blogs = getAllBlogs();
  const newBlog = {
    id: generateId("blog"),
    title,
    category,
    image: image || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/500`,
    content,
    status, // "published" | "draft"
    authorId,
    authorName,
    createdAt: new Date().toISOString(),
  };
  blogs.push(newBlog);
  writeList(STORAGE_KEYS.BLOGS, blogs);
  return newBlog;
}

function updateBlog(id, updates) {
  const blogs = getAllBlogs();
  const idx = blogs.findIndex((b) => b.id === id);
  if (idx === -1) return null;
  blogs[idx] = { ...blogs[idx], ...updates, updatedAt: new Date().toISOString() };
  writeList(STORAGE_KEYS.BLOGS, blogs);
  return blogs[idx];
}

function deleteBlog(id) {
  const blogs = getAllBlogs().filter((b) => b.id !== id);
  writeList(STORAGE_KEYS.BLOGS, blogs);
}

/* =========================================================
   SECTION 6: SHARED UI (navbar user state + mobile toggle)
   Runs on every page.
   ========================================================= */

function initNavbar() {
  const navLinks = document.getElementById("navLinks");
  const navToggle = document.getElementById("navToggle");
  if (navToggle && navLinks) {
    navToggle.addEventListener("click", () => {
      navLinks.classList.toggle("open");
    });
  }

  const navCta = document.getElementById("navCta");
  if (!navCta) return;

  const user = getCurrentUser();
  if (user) {
    navCta.innerHTML = `
      <span class="nav-user">${escapeHtml(user.fullName)}</span>
      <a href="dashboard.html" class="btn btn-outline btn-sm">Dashboard</a>
      <button class="btn btn-primary btn-sm" id="navLogoutBtn">Log out</button>
    `;
    document.getElementById("navLogoutBtn").addEventListener("click", logoutUser);
  } else {
    navCta.innerHTML = `
      <a href="login.html" class="btn btn-outline btn-sm">Log in</a>
      <a href="register.html" class="btn btn-primary btn-sm">Register</a>
    `;
  }
}

/* =========================================================
   SECTION 7: PAGE — HOME (index.html)
   ========================================================= */

function blogCardHtml(blog) {
  const excerpt = makeExcerpt(blog.content);
  return `
    <article class="blog-card">
      <img class="thumb" src="${escapeHtml(blog.image)}" alt="${escapeHtml(blog.title)}" loading="lazy">
      <div class="blog-card-body">
        <span class="tag">${escapeHtml(blog.category)}</span>
        <h3>${escapeHtml(blog.title)}</h3>
        <div class="byline">
          <span>${escapeHtml(blog.authorName)}</span>
          <span class="dot"></span>
          <span>${formatDate(blog.createdAt)}</span>
        </div>
        <p class="excerpt">${escapeHtml(excerpt)}</p>
        <a class="read-more" href="post.html?id=${encodeURIComponent(blog.id)}">Read more</a>
      </div>
    </article>
  `;
}

function initHomePage() {
  const featuredWrap = document.getElementById("featuredPost");
  const gridWrap = document.getElementById("blogGrid");
  const emptyWrap = document.getElementById("blogEmptyState");
  if (!gridWrap) return; // not on this page

  const published = getPublishedBlogs();

  if (published.length === 0) {
    if (featuredWrap) featuredWrap.classList.add("hidden");
    gridWrap.classList.add("hidden");
    if (emptyWrap) emptyWrap.classList.remove("hidden");
    return;
  }

  if (emptyWrap) emptyWrap.classList.add("hidden");

  const [featured, ...rest] = published;

  if (featuredWrap) {
    const excerpt = makeExcerpt(featured.content, 220);
    featuredWrap.innerHTML = `
      <img src="${escapeHtml(featured.image)}" alt="${escapeHtml(featured.title)}">
      <div class="featured-post-body">
        <span class="tag">${escapeHtml(featured.category)}</span>
        <h3>${escapeHtml(featured.title)}</h3>
        <div class="byline">
          <span>${escapeHtml(featured.authorName)}</span>
          <span class="dot"></span>
          <span>${formatDate(featured.createdAt)}</span>
        </div>
        <p class="excerpt">${escapeHtml(excerpt)}</p>
        <a href="post.html?id=${encodeURIComponent(featured.id)}" class="btn btn-primary">Read full story</a>
      </div>
    `;
  }

  const cardsSource = featuredWrap ? rest : published;
  gridWrap.innerHTML = cardsSource.map(blogCardHtml).join("") ||
    `<div class="empty-state"><h3>More stories coming soon</h3><p>Check back shortly.</p></div>`;
}

/* =========================================================
   SECTION 8: PAGE — SINGLE POST (post.html)
   ========================================================= */

function initPostPage() {
  const wrap = document.getElementById("postContent");
  if (!wrap) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const blog = id ? getBlogById(id) : null;

  if (!blog || blog.status !== "published") {
    wrap.innerHTML = `
      <div class="empty-state">
        <h3>Story not found</h3>
        <p>This post may have been removed or is not published.</p>
        <a href="index.html" class="btn btn-primary">Back to Home</a>
      </div>
    `;
    return;
  }

  document.title = `${blog.title} — BlogSpace`;
  wrap.innerHTML = `
    <span class="tag">${escapeHtml(blog.category)}</span>
    <h1 style="font-family:var(--font-display);font-size:clamp(1.8rem,4vw,2.6rem);margin:16px 0;line-height:1.15;">${escapeHtml(blog.title)}</h1>
    <div class="byline" style="margin-bottom:28px;">
      <span>${escapeHtml(blog.authorName)}</span>
      <span class="dot"></span>
      <span>${formatDate(blog.createdAt)}</span>
    </div>
    <img src="${escapeHtml(blog.image)}" alt="${escapeHtml(blog.title)}" style="width:100%;border-radius:var(--radius-md);margin-bottom:28px;max-height:420px;object-fit:cover;">
    <div style="font-size:1.05rem;color:var(--ink-soft);line-height:1.8;white-space:pre-wrap;">${escapeHtml(blog.content)}</div>
    <a href="index.html" class="btn btn-outline mt-24">← Back to all stories</a>
  `;
}

/* =========================================================
   SECTION 9: PAGE — REGISTER (register.html)
   ========================================================= */

function initRegisterPage() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  const alertEl = document.getElementById("registerAlert");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const fullNameField = document.getElementById("fullNameField");
    const emailField = document.getElementById("emailField");
    const passwordField = document.getElementById("passwordField");
    const confirmField = document.getElementById("confirmPasswordField");

    [fullNameField, emailField, passwordField, confirmField].forEach(clearFieldError);

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    let hasError = false;

    if (fullName.length < 2) {
      setFieldError(fullNameField, "Enter your full name.");
      hasError = true;
    }
    if (!isValidEmail(email)) {
      setFieldError(emailField, "Enter a valid email address.");
      hasError = true;
    }
    if (password.length < 6) {
      setFieldError(passwordField, "Password must be at least 6 characters.");
      hasError = true;
    }
    if (confirmPassword !== password || confirmPassword.length === 0) {
      setFieldError(confirmField, "Passwords do not match.");
      hasError = true;
    }

    if (hasError) return;

    const result = registerUser({ fullName, email, password });
    if (!result.success) {
      showAlert(alertEl, result.message, "error");
      return;
    }

    showAlert(alertEl, "Account created! Redirecting to login…", "success");
    form.reset();
    setTimeout(() => {
      window.location.href = "login.html";
    }, 1200);
  });
}

/* =========================================================
   SECTION 10: PAGE — LOGIN (login.html)
   ========================================================= */

function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  const alertEl = document.getElementById("loginAlert");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    hideAlert(alertEl);

    const emailField = document.getElementById("loginEmailField");
    const passwordField = document.getElementById("loginPasswordField");
    [emailField, passwordField].forEach(clearFieldError);

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const remember = document.getElementById("rememberMe").checked;

    let hasError = false;
    if (!isValidEmail(email)) {
      setFieldError(emailField, "Enter a valid email address.");
      hasError = true;
    }
    if (password.length === 0) {
      setFieldError(passwordField, "Enter your password.");
      hasError = true;
    }
    if (hasError) return;

    const result = loginUser({ email, password, remember });
    if (!result.success) {
      showAlert(alertEl, result.message, "error");
      return;
    }

    window.location.href = "dashboard.html";
  });
}

/* =========================================================
   SECTION 11: PAGE — DASHBOARD (dashboard.html)
   ========================================================= */

function initDashboardPage() {
  const marker = document.getElementById("dashUserName");
  if (!marker) return; // not on this page

  requireAuth();
  const user = getCurrentUser();
  if (!user) return;

  document.getElementById("dashUserName").textContent = user.fullName;
  document.getElementById("dashUserEmail").textContent = user.email;
  document.getElementById("dashAvatar").textContent = user.fullName.charAt(0).toUpperCase();
  document.getElementById("dashGreetName").textContent = user.fullName.split(" ")[0];

  renderDashboard();

  const logoutBtn = document.getElementById("dashLogoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", logoutUser);

  // Delete confirmation modal wiring
  const modal = document.getElementById("deleteModal");
  const cancelBtn = document.getElementById("cancelDeleteBtn");
  const confirmBtn = document.getElementById("confirmDeleteBtn");
  let pendingDeleteId = null;

  function openDeleteModal(id) {
    pendingDeleteId = id;
    modal.classList.add("show");
  }
  function closeDeleteModal() {
    pendingDeleteId = null;
    modal.classList.remove("show");
  }

  cancelBtn.addEventListener("click", closeDeleteModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeDeleteModal();
  });
  confirmBtn.addEventListener("click", () => {
    if (pendingDeleteId) {
      deleteBlog(pendingDeleteId);
      showToast("Blog deleted.", "success");
      renderDashboard();
    }
    closeDeleteModal();
  });

  // Event delegation for edit/delete buttons rendered dynamically
  document.getElementById("dashTableBody").addEventListener("click", (e) => {
    const editBtn = e.target.closest("[data-edit]");
    const deleteBtn = e.target.closest("[data-delete]");
    if (editBtn) {
      window.location.href = `create-blog.html?id=${encodeURIComponent(editBtn.dataset.edit)}`;
    }
    if (deleteBtn) {
      openDeleteModal(deleteBtn.dataset.delete);
    }
  });
}

function renderDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const myBlogs = getBlogsByUser(user.id);
  const total = myBlogs.length;
  const published = myBlogs.filter((b) => b.status === "published").length;
  const drafts = myBlogs.filter((b) => b.status === "draft").length;

  document.getElementById("statTotal").textContent = total;
  document.getElementById("statPublished").textContent = published;
  document.getElementById("statDrafts").textContent = drafts;

  const tableBody = document.getElementById("dashTableBody");
  const emptyState = document.getElementById("dashEmptyState");
  const tableWrap = document.getElementById("dashTableWrap");

  if (myBlogs.length === 0) {
    tableWrap.classList.add("hidden");
    emptyState.classList.remove("hidden");
    return;
  }

  tableWrap.classList.remove("hidden");
  emptyState.classList.add("hidden");

  tableBody.innerHTML = myBlogs
    .map(
      (b) => `
      <div class="blog-row">
        <img class="row-thumb" src="${escapeHtml(b.image)}" alt="">
        <div>
          <div class="row-title">${escapeHtml(b.title)}</div>
          <div class="row-meta">${escapeHtml(b.category)} · ${formatDate(b.createdAt)}</div>
        </div>
        <div><span class="tag status-${b.status}">${b.status}</span></div>
        <div class="row-meta">${formatDate(b.createdAt)}</div>
        <div class="row-actions">
          <button class="icon-btn" data-edit="${b.id}" title="Edit" aria-label="Edit">✎</button>
          <button class="icon-btn danger" data-delete="${b.id}" title="Delete" aria-label="Delete">🗑</button>
        </div>
      </div>
    `
    )
    .join("");
}

/* =========================================================
   SECTION 12: PAGE — CREATE / EDIT BLOG (create-blog.html)
   ========================================================= */

function initCreateBlogPage() {
  const form = document.getElementById("blogForm");
  if (!form) return; // not on this page

  requireAuth();
  const user = getCurrentUser();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const existingBlog = editId ? getBlogById(editId) : null;

  const pageTitle = document.getElementById("editorPageTitle");
  const publishBtn = document.getElementById("publishBtn");
  const draftBtn = document.getElementById("draftBtn");
  const cancelBtn = document.getElementById("cancelBtn");
  const titleInput = document.getElementById("blogTitle");
  const categoryInput = document.getElementById("blogCategory");
  const imageInput = document.getElementById("blogImage");
  const contentInput = document.getElementById("blogContent");
  const previewThumb = document.getElementById("previewThumb");
  const charCount = document.getElementById("charCount");

  // If editing, and the blog belongs to someone else, block it.
  if (existingBlog && existingBlog.authorId !== user.id) {
    showToast("You can only edit your own posts.", "error");
    window.location.href = "dashboard.html";
    return;
  }

  if (existingBlog) {
    pageTitle.textContent = "Edit Blog";
    titleInput.value = existingBlog.title;
    categoryInput.value = existingBlog.category;
    imageInput.value = existingBlog.image;
    contentInput.value = existingBlog.content;
    updatePreview();
  }

  function updatePreview() {
    const url = imageInput.value.trim();
    if (url) {
      previewThumb.innerHTML = `<img src="${escapeHtml(url)}" alt="Preview" style="width:100%;height:100%;object-fit:cover;">`;
    } else {
      previewThumb.innerHTML = "Image preview appears here";
    }
    charCount.textContent = `${contentInput.value.length} characters`;
  }

  imageInput.addEventListener("input", updatePreview);
  contentInput.addEventListener("input", updatePreview);
  updatePreview();

  function clearErrors() {
    ["blogTitleField", "blogCategoryField", "blogContentField"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) clearFieldError(el);
    });
  }

  function validate() {
    clearErrors();
    let valid = true;
    if (titleInput.value.trim().length < 4) {
      setFieldError(document.getElementById("blogTitleField"), "Title must be at least 4 characters.");
      valid = false;
    }
    if (!categoryInput.value) {
      setFieldError(document.getElementById("blogCategoryField"), "Choose a category.");
      valid = false;
    }
    if (contentInput.value.trim().length < 20) {
      setFieldError(document.getElementById("blogContentField"), "Write at least 20 characters of content.");
      valid = false;
    }
    return valid;
  }

  function saveBlog(status) {
    if (!validate()) return;

    const payload = {
      title: titleInput.value.trim(),
      category: categoryInput.value,
      image: imageInput.value.trim(),
      content: contentInput.value.trim(),
      status,
    };

    if (existingBlog) {
      updateBlog(existingBlog.id, payload);
      showToast(status === "published" ? "Blog published!" : "Draft saved.", "success");
    } else {
      createBlog({
        ...payload,
        authorId: user.id,
        authorName: user.fullName,
      });
      showToast(status === "published" ? "Blog published!" : "Draft saved.", "success");
    }

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 700);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    saveBlog("published");
  });

  draftBtn.addEventListener("click", () => saveBlog("draft"));

  cancelBtn.addEventListener("click", () => {
    window.location.href = "dashboard.html";
  });
}

/* =========================================================
   SECTION 13: BOOTSTRAP
   Runs on every page once the DOM is ready.
   ========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  seedSampleData();
  initNavbar();
  initHomePage();
  initPostPage();
  initRegisterPage();
  initLoginPage();
  initDashboardPage();
  initCreateBlogPage();
});
