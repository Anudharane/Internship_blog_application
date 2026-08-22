# 🚀 BlogSpace — Full Stack Blog Application

A modern, responsive, and secure **Full Stack Blog Platform** built with **Node.js, Express 5, MongoDB Atlas, Mongoose, and JWT Authentication**, featuring a responsive vanilla JavaScript & CSS3 frontend.

---

## 🌟 Key Features

* **🔐 Secure Authentication & Session Management**:
  * User Registration with automatic email normalization and password validation.
  * Password encryption using **bcryptjs** (10 salt rounds).
  * **JSON Web Tokens (JWT)** for stateless, secure API authentication.
  * Remember Me functionality using `localStorage` / `sessionStorage`.
  * Forgot Password & Password Reset flow.
  * Auto-logout on token expiration.

* **📝 Complete Blog CRUD Operations**:
  * **Create**: Write stories with category selection and image options (URL or File Upload).
  * **Read**: Dynamic feeds on the Home page, single-post reader (`post.html?id=...`), and personal dashboard.
  * **Update**: Full editing capabilities for post title, category, image, and content.
  * **Delete**: Secure deletion with custom interactive confirmation modal dialogs.
  * **Draft & Publish**: Save drafts privately or publish directly to the public feed.

* **📸 Dual Image Support & File Uploads**:
  * **🔗 Use URL**: Paste external web image URLs.
  * **📁 File Upload**: Drag-and-drop or browse image files from your computer (supported formats: JPG, PNG, GIF, WebP, SVG, up to 20MB).
  * **⚡ Instant Preview**: Zero-latency local thumbnail preview before uploading.

* **🔍 Real-Time Search & Category Filtering**:
  * Debounced search bar (300ms) with case-insensitive MongoDB `$regex` querying across titles and content.
  * Quick filter chips: *All, Design, Development, Lifestyle, Career, Productivity, Other*.

* **👤 User Profile Management**:
  * Live profile view (`profile.html`) synced in real-time with MongoDB Atlas.
  * Edit Full Name and Email address with duplicate email prevention.
  * Change password securely by verifying the existing password first.

* **📱 Modern, Mobile-First UI**:
  * Responsive layout with mobile hamburger navigation.
  * Clean typography, interactive cards, toast notifications, and zero external CSS/JS framework bloat.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | HTML5, CSS3 (Modern Flexbox & CSS Grid), Vanilla JavaScript (ES6+ Async/Await) |
| **Backend** | Node.js, Express 5 REST API |
| **Database** | MongoDB Atlas (Cloud NoSQL DB), Mongoose ODM |
| **Security & Auth** | JSON Web Tokens (`jsonwebtoken`), Password Hashing (`bcryptjs`), CORS |
| **File Uploads** | Multer |
| **Environment** | Dotenv (`.env`) |

---

## 📂 Project Directory Structure

```
blog-application/
├── css/
│   └── style.css            # Unified styling, design tokens, and responsive queries
├── js/
│   └── script.js            # Client-side routing, API controllers, and DOM handlers
├── assets/
│   └── images/              # Static branding and illustration assets
├── uploads/                 # Server directory for user-uploaded blog images
│
├── index.html               # Home page (Hero, Featured story, search & archive grid)
├── post.html                # Single story reader page
├── login.html               # User login page
├── register.html            # User registration page
├── forgot-password.html     # Password reset page
├── dashboard.html           # User dashboard (stats, post list, edit/delete)
├── profile.html             # Profile & account security management
├── create-blog.html         # Blog creator/editor with dual image options
│
├── server.js                # Express application, REST endpoints, and middleware
├── database.js              # MongoDB Atlas connection & Mongoose data models
├── render.yaml              # Render deployment configuration
├── vercel.json              # Vercel deployment configuration
├── package.json             # Project dependencies and npm scripts
└── README.md                # Project documentation
```

---

## ⚙️ Installation & Local Setup

### 1. Prerequisites
* [Node.js](https://nodejs.org/) (version 18.0 or higher)
* [MongoDB Atlas](https://www.mongodb.com/atlas/database) account or local MongoDB instance

### 2. Clone the Repository
```bash
git clone https://github.com/Anudharane/Internship_blog_application.git
cd Internship_blog_application
```

### 3. Install Dependencies
```bash
npm install
```

### 4. Configure Environment Variables
Create a `.env` file in the root directory:
```env
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key
```

### 5. Start the Application
```bash
# Production start
npm start

# Development mode with auto-reload
npm run dev
```

Open your browser and navigate to **`http://localhost:3000`**.

---

## 📡 REST API Documentation

### Authentication Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new user account |
| `POST` | `/api/auth/login` | Public | Authenticate user & issue JWT |
| `POST` | `/api/auth/reset-password` | Public | Reset password for existing email |
| `GET` | `/api/auth/me` | 🔒 Private | Fetch current user data from MongoDB |
| `POST` | `/api/auth/update-profile` | 🔒 Private | Update full name and email |
| `POST` | `/api/auth/change-password` | 🔒 Private | Verify old password & update to new hash |

### Blog Endpoints
| Method | Endpoint | Access | Description |
|---|---|---|---|
| `GET` | `/api/blogs` | Public | Get all published posts (supports `?search=` and `?category=`) |
| `GET` | `/api/blogs/my` | 🔒 Private | Get all blogs authored by logged-in user |
| `GET` | `/api/blogs/:id` | Public/Private | Get single post details by ID |
| `POST` | `/api/blogs` | 🔒 Private | Create a new blog post |
| `PUT` | `/api/blogs/:id` | 🔒 Private | Update existing post (owner-only) |
| `DELETE`| `/api/blogs/:id` | 🔒 Private | Delete blog post (owner-only) |
| `POST` | `/api/upload` | 🔒 Private | Upload image file (returns `/uploads/...`) |

---

## 🚀 Deployment Guide

### Option 1: Deploy to Render (Recommended)
1. Push your repository to GitHub.
2. Log into [Render](https://render.com/) and click **New → Web Service**.
3. Connect your GitHub repository.
4. Set the following settings:
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. In the **Environment Variables** section, add:
   - `MONGODB_URI`: `<your-mongodb-atlas-connection-string>`
   - `JWT_SECRET`: `<your-jwt-secret>`
6. Click **Deploy Web Service**.

### Option 2: Deploy to Vercel
1. Install Vercel CLI or import repository from [Vercel Dashboard](https://vercel.com/).
2. Vercel automatically detects the included `vercel.json` configuration.
3. Add `MONGODB_URI` and `JWT_SECRET` in **Project Settings → Environment Variables**.
4. Click **Deploy**.

---

## 📄 License
This project is licensed under the ISC License.
