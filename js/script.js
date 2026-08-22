/* =========================================================
   BlogSpace — script.js
   All app logic lives in this one file and is shared by every
   page. Each page only has a few DOM elements with specific
   IDs, so the functions below check "does this element exist
   on this page?" before doing anything.

   AUTH STATE STORAGE KEY
   - "blogspace_session" -> the currently logged-in user session
                            with JWT token: { id, fullName, email, token }
   ========================================================= */

const STORAGE_KEYS = {
  SESSION: "blogspace_session",
};

// Determine API URL based on how the frontend is accessed
const API_URL = window.location.origin.startsWith("http") && window.location.port === "3000"
  ? ""
  : "http://localhost:3000";

/* =========================================================
   SECTION 1: LOW-LEVEL STORAGE & API HELPERS
   ========================================================= */

/**
 * Reads session state from either localStorage or sessionStorage
 */
function readSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SESSION) || sessionStorage.getItem(STORAGE_KEYS.SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    return null;
  }
}

/**
 * Writes session state. If remember is true, stores in localStorage
 * so it survives browser closing. Otherwise stores in sessionStorage.
 */
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

/**
 * Clears session state from both storages
 */
function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  sessionStorage.removeItem(STORAGE_KEYS.SESSION);
}

/**
 * Generic fetch wrapper that handles JSON headers and authorization tokens
 */
async function apiFetch(endpoint, options = {}) {
  const session = readSession();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  
  if (session && session.token) {
    headers['Authorization'] = `Bearer ${session.token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Auto-logout if token is expired or invalid
  if (response.status === 401) {
    clearSession();
    window.location.href = 'login.html';
    return;
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || 'API request failed');
  }

  return response.json();
}

/**
 * Seeding is now handled by the backend database
 */
function seedSampleData() {
  // Noop on frontend
}

/* =========================================================
   SECTION 2: SMALL UTILITIES
   ========================================================= */

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
   SECTION 3: AUTHENTICATION
   ========================================================= */

function getCurrentUser() {
  return readSession();
}

function isLoggedIn() {
  return getCurrentUser() !== null;
}

/**
 * Protects a page: if nobody is logged in, bounce to login.html.
 */
function requireAuth() {
  if (!isLoggedIn()) {
    window.location.href = "login.html";
  }
}

async function registerUser({ fullName, email, password }) {
  try {
    const result = await apiFetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ fullName, email, password })
    });
    return { success: true, user: result.user };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

async function loginUser({ email, password, remember = false }) {
  try {
    const result = await apiFetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
    if (result.success) {
      const sessionUser = { 
        id: result.user.id, 
        fullName: result.user.fullName, 
        email: result.user.email,
        token: result.token
      };
      writeSession(sessionUser, remember);
      return { success: true, user: sessionUser };
    }
    return { success: false, message: result.message || "Invalid email or password." };
  } catch (err) {
    return { success: false, message: err.message };
  }
}

function logoutUser() {
  clearSession();
  window.location.href = "login.html";
}

/* =========================================================
   SECTION 4: BLOG CRUD
   ========================================================= */

async function getPublishedBlogs(filters = {}) {
  try {
    const params = new URLSearchParams();
    if (filters.search) params.append("search", filters.search);
    if (filters.category && filters.category !== "All") params.append("category", filters.category);
    
    const queryString = params.toString() ? `?${params.toString()}` : "";
    return await apiFetch(`/api/blogs${queryString}`);
  } catch (err) {
    console.error("Failed to fetch published blogs:", err);
    return [];
  }
}

async function getBlogsByUser(userId) {
  try {
    return await apiFetch("/api/blogs/my");
  } catch (err) {
    console.error("Failed to fetch user blogs:", err);
    return [];
  }
}

async function getBlogById(id) {
  try {
    return await apiFetch(`/api/blogs/${id}`);
  } catch (err) {
    console.error(`Failed to fetch blog with ID ${id}:`, err);
    return null;
  }
}

async function createBlog({ title, category, image, content, status }) {
  return await apiFetch("/api/blogs", {
    method: "POST",
    body: JSON.stringify({ title, category, image, content, status })
  });
}

async function updateBlog(id, updates) {
  return await apiFetch(`/api/blogs/${id}`, {
    method: "PUT",
    body: JSON.stringify(updates)
  });
}

async function deleteBlog(id) {
  return await apiFetch(`/api/blogs/${id}`, {
    method: "DELETE"
  });
}

/* =========================================================
   SECTION 5: SHARED UI (navbar user state + mobile toggle)
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
   SECTION 6: PAGE — HOME (index.html)
   ========================================================= */

function blogCardHtml(blog) {
  const excerpt = makeExcerpt(blog.content);
  const imgTag = blog.image
    ? `<img class="thumb" src="${escapeHtml(blog.image)}" alt="${escapeHtml(blog.title)}" loading="lazy">`
    : "";
  return `
    <article class="blog-card">
      ${imgTag}
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

async function initHomePage() {
  const featuredWrap = document.getElementById("featuredPost");
  const gridWrap = document.getElementById("blogGrid");
  const emptyWrap = document.getElementById("blogEmptyState");
  const countStamp = document.getElementById("heroPostCount");
  if (!gridWrap) return; // not on this page

  let currentCategory = "All";
  let currentSearch = "";

  async function updateList() {
    const blogs = await getPublishedBlogs({ search: currentSearch, category: currentCategory });
    
    if (countStamp && !currentSearch && currentCategory === "All") {
      countStamp.textContent = blogs.length;
    }

    const isFiltering = currentSearch || (currentCategory && currentCategory !== "All");

    if (isFiltering) {
      if (featuredWrap) featuredWrap.classList.add("hidden");
      gridWrap.classList.remove("hidden");
      gridWrap.innerHTML = blogs.map(blogCardHtml).join("") ||
        `<div class="empty-state"><h3>No matches found</h3><p>Try adjusting your search or category filters.</p></div>`;
      if (emptyWrap) emptyWrap.classList.add("hidden");
    } else {
      if (blogs.length === 0) {
        if (featuredWrap) featuredWrap.classList.add("hidden");
        gridWrap.classList.add("hidden");
        if (emptyWrap) emptyWrap.classList.remove("hidden");
        return;
      }

      if (emptyWrap) emptyWrap.classList.add("hidden");

      const [featured, ...rest] = blogs;

      if (featuredWrap) {
        featuredWrap.classList.remove("hidden");
        featuredWrap.className = featured.image ? "featured-post" : "featured-post no-image";
        const excerpt = makeExcerpt(featured.content, 220);
        const featImg = featured.image
          ? `<img src="${escapeHtml(featured.image)}" alt="${escapeHtml(featured.title)}">`
          : "";
        featuredWrap.innerHTML = `
          ${featImg}
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

      const cardsSource = featuredWrap ? rest : blogs;
      gridWrap.classList.remove("hidden");
      gridWrap.innerHTML = cardsSource.map(blogCardHtml).join("") ||
        `<div class="empty-state"><h3>More stories coming soon</h3><p>Check back shortly.</p></div>`;
    }
  }

  // Initial render
  await updateList();

  // Search input handler with debounce
  const searchInput = document.getElementById("blogSearch");
  if (searchInput) {
    let debounceTimer;
    searchInput.addEventListener("input", (e) => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        currentSearch = e.target.value.trim();
        updateList();
      }, 300);
    });
  }

  // Category filters click handler
  const categoryFilters = document.getElementById("categoryFilters");
  if (categoryFilters) {
    categoryFilters.addEventListener("click", (e) => {
      const btn = e.target.closest(".btn-filter");
      if (!btn) return;

      categoryFilters.querySelectorAll(".btn-filter").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentCategory = btn.dataset.category;
      updateList();
    });
  }
}

/* =========================================================
   SECTION 7: PAGE — SINGLE POST (post.html)
   ========================================================= */

async function initPostPage() {
  const wrap = document.getElementById("postContent");
  if (!wrap) return;

  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const blog = id ? await getBlogById(id) : null;

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

  const postImgTag = blog.image
    ? `<img src="${escapeHtml(blog.image)}" alt="${escapeHtml(blog.title)}" style="width:100%;border-radius:var(--radius-md);margin-bottom:28px;max-height:420px;object-fit:cover;">`
    : "";

  document.title = `${blog.title} — BlogSpace`;
  wrap.innerHTML = `
    <span class="tag">${escapeHtml(blog.category)}</span>
    <h1 style="font-family:var(--font-display);font-size:clamp(1.8rem,4vw,2.6rem);margin:16px 0;line-height:1.15;">${escapeHtml(blog.title)}</h1>
    <div class="byline" style="margin-bottom:28px;">
      <span>${escapeHtml(blog.authorName)}</span>
      <span class="dot"></span>
      <span>${formatDate(blog.createdAt)}</span>
    </div>
    ${postImgTag}
    <div style="font-size:1.05rem;color:var(--ink-soft);line-height:1.8;white-space:pre-wrap;">${escapeHtml(blog.content)}</div>
    <a href="index.html" class="btn btn-outline mt-24">← Back to all stories</a>
  `;
}

/* =========================================================
   SECTION 8: PAGE — REGISTER (register.html)
   ========================================================= */

function initRegisterPage() {
  const form = document.getElementById("registerForm");
  if (!form) return;

  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  const alertEl = document.getElementById("registerAlert");

  form.addEventListener("submit", async (e) => {
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

    const result = await registerUser({ fullName, email, password });
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
   SECTION 9: PAGE — LOGIN (login.html)
   ========================================================= */

function initLoginPage() {
  const form = document.getElementById("loginForm");
  if (!form) return;

  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  const alertEl = document.getElementById("loginAlert");

  form.addEventListener("submit", async (e) => {
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

    const result = await loginUser({ email, password, remember });
    if (!result.success) {
      showAlert(alertEl, result.message, "error");
      return;
    }

    window.location.href = "dashboard.html";
  });
}

/* =========================================================
   SECTION 10: PAGE — DASHBOARD (dashboard.html)
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
  confirmBtn.addEventListener("click", async () => {
    if (pendingDeleteId) {
      try {
        await deleteBlog(pendingDeleteId);
        showToast("Blog deleted.", "success");
        await renderDashboard();
      } catch (err) {
        showToast("Failed to delete blog.", "error");
      }
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

async function renderDashboard() {
  const user = getCurrentUser();
  if (!user) return;

  const myBlogs = await getBlogsByUser(user.id);
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
      (b) => {
        const thumbHtml = b.image
          ? `<img class="row-thumb" src="${escapeHtml(b.image)}" alt="" onerror="this.style.display='none';if(this.nextElementSibling)this.nextElementSibling.style.display='flex';"><div class="row-thumb" style="display:none;align-items:center;justify-content:center;background:var(--cream-soft);color:var(--cobalt);font-weight:700;font-size:1.1rem;border-radius:var(--radius-sm);">${escapeHtml((b.category || b.title || 'B').charAt(0).toUpperCase())}</div>`
          : `<div class="row-thumb" style="display:flex;align-items:center;justify-content:center;background:var(--cream-soft);color:var(--cobalt);font-weight:700;font-size:1.1rem;border-radius:var(--radius-sm);">${escapeHtml((b.category || b.title || 'B').charAt(0).toUpperCase())}</div>`;

        return `
        <div class="blog-row">
          ${thumbHtml}
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
      `;
      }
    )
    .join("");
}

/* =========================================================
   SECTION 11: PAGE — CREATE / EDIT BLOG (create-blog.html)
   ========================================================= */

async function initCreateBlogPage() {
  const form = document.getElementById("blogForm");
  if (!form) return; // not on this page

  requireAuth();
  const user = getCurrentUser();
  if (!user) return;

  const params = new URLSearchParams(window.location.search);
  const editId = params.get("id");
  const existingBlog = editId ? await getBlogById(editId) : null;

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

  const btnRemoveImage = document.getElementById("btnRemoveImage");
  let currentPreviewUrl = "";

  function updatePreview() {
    const url = imageInput.value.trim() || currentPreviewUrl;
    if (url) {
      previewThumb.innerHTML = `<img src="${escapeHtml(url)}" alt="Preview" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius-sm);">`;
      if (btnRemoveImage) btnRemoveImage.style.display = "inline-block";
    } else {
      previewThumb.innerHTML = "Image preview appears here";
      if (btnRemoveImage) btnRemoveImage.style.display = "none";
    }
    charCount.textContent = `${contentInput.value.length} characters`;
  }

  if (existingBlog) {
    pageTitle.textContent = "Edit Blog";
    titleInput.value = existingBlog.title || "";
    categoryInput.value = existingBlog.category || "";
    imageInput.value = existingBlog.image || "";
    contentInput.value = existingBlog.content || "";
    currentPreviewUrl = existingBlog.image || "";
    updatePreview();
  } else {
    currentPreviewUrl = imageInput.value.trim();
    updatePreview();
  }

  imageInput.addEventListener("input", () => {
    currentPreviewUrl = imageInput.value.trim();
    updatePreview();
  });
  contentInput.addEventListener("input", updatePreview);

  if (btnRemoveImage) {
    btnRemoveImage.addEventListener("click", () => {
      imageInput.value = "";
      currentPreviewUrl = "";
      if (blogImageFile) blogImageFile.value = "";
      if (uploadLabel) uploadLabel.textContent = "Click or drag an image here";
      if (uploadStatus) uploadStatus.textContent = "";
      updatePreview();
      showToast("Image removed.", "info");
    });
  }

  updatePreview();

  // Image Tabs & File Upload Handling
  const tabUrl = document.getElementById("tabUrl");
  const tabUpload = document.getElementById("tabUpload");
  const imgUrlWrap = document.getElementById("imgUrlWrap");
  const imgUploadWrap = document.getElementById("imgUploadWrap");
  const uploadDropZone = document.getElementById("uploadDropZone");
  const blogImageFile = document.getElementById("blogImageFile");
  const uploadLabel = document.getElementById("uploadLabel");
  const uploadStatus = document.getElementById("uploadStatus");

  if (tabUrl && tabUpload) {
    tabUrl.addEventListener("click", () => {
      tabUrl.classList.add("active");
      tabUpload.classList.remove("active");
      imgUrlWrap.style.display = "block";
      imgUploadWrap.style.display = "none";
    });

    tabUpload.addEventListener("click", () => {
      tabUpload.classList.add("active");
      tabUrl.classList.remove("active");
      imgUrlWrap.style.display = "none";
      imgUploadWrap.style.display = "block";
    });
  }

  if (uploadDropZone && blogImageFile) {
    uploadDropZone.addEventListener("click", () => blogImageFile.click());
    
    uploadDropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      uploadDropZone.classList.add("dragover");
    });
    
    uploadDropZone.addEventListener("dragleave", () => {
      uploadDropZone.classList.remove("dragover");
    });
    
    uploadDropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      uploadDropZone.classList.remove("dragover");
      if (e.dataTransfer.files && e.dataTransfer.files.length) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    });

    blogImageFile.addEventListener("change", () => {
      if (blogImageFile.files && blogImageFile.files.length) {
        handleImageUpload(blogImageFile.files[0]);
      }
    });
  }

  let activeUploadPromise = null;

  async function handleImageUpload(file) {
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|gif|webp|svg|bmp|jfif)$/i.test(file.name);
    if (!isImage) {
      showToast("Please select a valid image file", "error");
      return;
    }

    // ⚡ Instant Local Preview (0ms latency)
    try {
      currentPreviewUrl = URL.createObjectURL(file);
      updatePreview();
    } catch (e) {
      console.warn("Local preview object URL error:", e);
    }

    uploadLabel.textContent = `Uploading ${file.name}...`;
    uploadStatus.textContent = "Uploading image to server...";

    const formData = new FormData();
    formData.append("image", file);

    activeUploadPromise = (async () => {
      try {
        const session = readSession();
        const headers = {};
        if (session && session.token) {
          headers["Authorization"] = `Bearer ${session.token}`;
        }

        const res = await fetch(`${API_URL}/api/upload`, {
          method: "POST",
          headers,
          body: formData
        });

        const data = await res.json();
        if (data && data.success && data.url) {
          imageInput.value = data.url;
          currentPreviewUrl = data.url;
          uploadLabel.textContent = `Uploaded: ${file.name}`;
          uploadStatus.textContent = "✅ Image uploaded successfully!";
          updatePreview();
          showToast("Image uploaded!", "success");
          return data.url;
        } else {
          uploadLabel.textContent = "Click or drag an image here";
          uploadStatus.textContent = "❌ " + ((data && data.message) || "Upload failed");
          showToast((data && data.message) || "Upload failed", "error");
          return null;
        }
      } catch (err) {
        console.error("Upload error:", err);
        uploadLabel.textContent = "Click or drag an image here";
        uploadStatus.textContent = "❌ Upload error: " + err.message;
        showToast("Error uploading image: " + err.message, "error");
        return null;
      } finally {
        activeUploadPromise = null;
      }
    })();

    await activeUploadPromise;
  }

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

  async function saveBlog(status) {
    if (!validate()) return;

    if (activeUploadPromise) {
      uploadStatus.textContent = "⏳ Finishing image upload before publishing...";
      const uploadedUrl = await activeUploadPromise;
      if (uploadedUrl) {
        imageInput.value = uploadedUrl;
      }
    }

    const payload = {
      title: titleInput.value.trim(),
      category: categoryInput.value,
      image: imageInput.value.trim(),
      content: contentInput.value.trim(),
      status,
    };

    try {
      if (existingBlog) {
        await updateBlog(existingBlog.id, payload);
        showToast(status === "published" ? "Blog published!" : "Draft saved.", "success");
      } else {
        await createBlog(payload);
        showToast(status === "published" ? "Blog published!" : "Draft saved.", "success");
      }

      setTimeout(() => {
        window.location.href = "dashboard.html";
      }, 700);
    } catch (err) {
      showToast("Failed to save blog: " + err.message, "error");
    }
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
   SECTION 12: BOOTSTRAP
   Runs on every page once the DOM is ready.
   ========================================================= */

/* =========================================================
   FORGOT / RESET PASSWORD PAGE
   ========================================================= */
async function resetPassword(email, password) {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  return res.json();
}

function initForgotPasswordPage() {
  const form = document.getElementById('forgotForm');
  if (!form) return;

  const alertBox          = document.getElementById('forgotAlert');
  const emailField        = document.getElementById('forgotEmailField');
  const newPasswordField  = document.getElementById('newPasswordField');
  const confirmField      = document.getElementById('confirmNewPasswordField');
  const emailInput        = document.getElementById('forgotEmail');
  const newPasswordInput  = document.getElementById('newPassword');
  const confirmInput      = document.getElementById('confirmNewPassword');

  function clearErrors() {
    [emailField, newPasswordField, confirmField].forEach(f => f && f.classList.remove('field-error-active'));
    alertBox.style.display = 'none';
    alertBox.textContent   = '';
  }

  function showAlert(msg) {
    alertBox.textContent   = msg;
    alertBox.style.display = 'block';
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const email    = emailInput.value.trim();
    const password = newPasswordInput.value;
    const confirm  = confirmInput.value;
    let valid      = true;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      emailField.classList.add('field-error-active');
      valid = false;
    }
    if (!password || password.length < 6) {
      newPasswordField.classList.add('field-error-active');
      valid = false;
    }
    if (password !== confirm) {
      confirmField.classList.add('field-error-active');
      valid = false;
    }
    if (!valid) return;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled    = true;
    btn.textContent = 'Resetting…';

    try {
      const data = await resetPassword(email, password);
      if (data.success) {
        showAlert('✅ ' + data.message);
        alertBox.style.background    = '#d1fae5';
        alertBox.style.color         = '#065f46';
        alertBox.style.borderColor   = '#6ee7b7';
        setTimeout(() => { window.location.href = 'login.html'; }, 2000);
      } else {
        showAlert(data.message || 'Reset failed. Please try again.');
        btn.disabled    = false;
        btn.textContent = 'Reset Password';
      }
    } catch {
      showAlert('Network error. Please try again.');
      btn.disabled    = false;
      btn.textContent = 'Reset Password';
    }
  });
}

/* =========================================================
   PROFILE PAGE (profile.html)
   ========================================================= */

async function updateProfile(fullName, email) {
  return await apiFetch('/api/auth/update-profile', {
    method: 'POST',
    body: JSON.stringify({ fullName, email })
  });
}

async function changePassword(oldPassword, newPassword) {
  return await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ oldPassword, newPassword })
  });
}

async function initProfilePage() {
  const profileForm = document.getElementById('profileForm');
  if (!profileForm) return;

  requireAuth();
  const session = getCurrentUser();
  if (!session) return;

  // Immediately fill sidebar and form fields with session data
  const emailInput = document.getElementById('profileEmail');
  const nameInput = document.getElementById('profileName');
  const avatarEl = document.getElementById('dashAvatar');
  const userEl = document.getElementById('dashUserName');
  const userEmailEl = document.getElementById('dashUserEmail');

  if (emailInput && session.email) emailInput.value = session.email;
  if (nameInput && session.fullName) nameInput.value = session.fullName;
  if (avatarEl && session.fullName) avatarEl.textContent = session.fullName.charAt(0).toUpperCase();
  if (userEl && session.fullName) userEl.textContent = session.fullName;
  if (userEmailEl && session.email) userEmailEl.textContent = session.email;

  // Logout
  const logoutBtn = document.getElementById('dashLogoutBtn');
  if (logoutBtn) logoutBtn.addEventListener('click', logoutUser);

  // Fetch and sync LIVE user data from MongoDB Atlas
  try {
    const result = await apiFetch('/api/auth/me');
    if (result && result.user) {
      const user = result.user;
      if (emailInput) emailInput.value = user.email || '';
      if (nameInput) nameInput.value = user.fullName || '';
      if (avatarEl) avatarEl.textContent = (user.fullName || '?').charAt(0).toUpperCase();
      if (userEl) userEl.textContent = user.fullName || '—';
      if (userEmailEl) userEmailEl.textContent = user.email || '—';
    }
  } catch (err) {
    console.warn("Could not fetch fresh user profile from database:", err);
  }

  /* ---- Profile Info Form ---- */
  const profileAlert    = document.getElementById('profileAlert');
  const profileNameFld  = document.getElementById('profileNameField');
  const profileEmailFld = document.getElementById('profileEmailField');

  profileForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (profileNameFld) profileNameFld.classList.remove('has-error');
    if (profileEmailFld) profileEmailFld.classList.remove('has-error');
    profileAlert.style.display = 'none';

    const fullName = document.getElementById('profileName').value.trim();
    const email = document.getElementById('profileEmail').value.trim();
    let valid = true;

    if (fullName.length < 2) {
      if (profileNameFld) profileNameFld.classList.add('has-error');
      valid = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      if (profileEmailFld) profileEmailFld.classList.add('has-error');
      valid = false;
    }

    if (!valid) return;

    const btn = document.getElementById('profileSaveBtn');
    btn.disabled    = true;
    btn.textContent = 'Saving…';

    try {
      const data = await updateProfile(fullName, email);
      if (data && data.success) {
        // Update stored session with new name, email, and token
        const session = readSession();
        session.fullName = data.user.fullName;
        session.email = data.user.email;
        if (data.token) session.token = data.token;
        writeSession(session, !!localStorage.getItem('blogspace_session'));

        profileAlert.textContent    = '✅ Profile updated successfully!';
        profileAlert.style.display  = 'block';
        profileAlert.style.background   = '#d1fae5';
        profileAlert.style.color        = '#065f46';
        profileAlert.style.borderColor  = '#6ee7b7';
        document.getElementById('dashUserName').textContent = fullName;
        document.getElementById('dashUserEmail').textContent = email;
        document.getElementById('dashAvatar').textContent   = fullName.charAt(0).toUpperCase();
        showToast('Profile updated!', 'success');
      } else {
        profileAlert.textContent   = (data && data.message) || 'Update failed.';
        profileAlert.style.display = 'block';
        profileAlert.style.background  = '';
        profileAlert.style.color       = '';
        profileAlert.style.borderColor = '';
      }
    } catch (err) {
      profileAlert.textContent   = err.message || 'Network error.';
      profileAlert.style.display = 'block';
    }

    btn.disabled    = false;
    btn.textContent = 'Save changes';
  });

  /* ---- Change Password Form ---- */
  const pwdForm    = document.getElementById('passwordForm');
  const pwdAlert   = document.getElementById('pwdAlert');
  const oldPwdFld  = document.getElementById('oldPasswordField');
  const newPwdFld  = document.getElementById('newPasswordField');
  const confPwdFld = document.getElementById('confirmPwdField');

  pwdForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    [oldPwdFld, newPwdFld, confPwdFld].forEach(f => f.classList.remove('has-error'));
    pwdAlert.style.display = 'none';

    const oldPassword = document.getElementById('oldPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPwd  = document.getElementById('confirmPwd').value;
    let valid = true;

    if (!oldPassword) { oldPwdFld.classList.add('has-error'); valid = false; }
    if (!newPassword || newPassword.length < 6) { newPwdFld.classList.add('has-error'); valid = false; }
    if (newPassword !== confirmPwd) { confPwdFld.classList.add('has-error'); valid = false; }
    if (!valid) return;

    const btn = document.getElementById('pwdSaveBtn');
    btn.disabled    = true;
    btn.textContent = 'Updating…';

    try {
      const data = await changePassword(oldPassword, newPassword);
      if (data && data.success) {
        pwdAlert.textContent   = '✅ Password changed! Please log in again.';
        pwdAlert.style.display = 'block';
        pwdAlert.style.background  = '#d1fae5';
        pwdAlert.style.color       = '#065f46';
        pwdAlert.style.borderColor = '#6ee7b7';
        pwdForm.reset();
        showToast('Password changed. Logging out…', 'success');
        setTimeout(() => logoutUser(), 2500);
      } else {
        pwdAlert.textContent   = (data && data.message) || 'Failed to change password.';
        pwdAlert.style.display = 'block';
        pwdAlert.style.background  = '';
        pwdAlert.style.color       = '';
        pwdAlert.style.borderColor = '';
        btn.disabled    = false;
        btn.textContent = 'Update password';
      }
    } catch (err) {
      pwdAlert.textContent   = err.message || 'Network error.';
      pwdAlert.style.display = 'block';
      btn.disabled    = false;
      btn.textContent = 'Update password';
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  seedSampleData();
  initNavbar();
  initHomePage();
  initPostPage();
  initRegisterPage();
  initLoginPage();
  initDashboardPage();
  initCreateBlogPage();
  initForgotPasswordPage();
  initProfilePage();
});
