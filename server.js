require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_blogspace_token_key_123!';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Authentication middleware
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Access denied. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ success: false, message: 'Invalid token.' });
  }
}

/* =========================================================
   AUTHENTICATION ENDPOINTS
   ========================================================= */

// User Registration
app.post('/api/auth/register', (req, res) => {
  const { fullName, email, password } = req.body;
  if (!fullName || !email || !password) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (fullName.length < 2) {
    return res.status(400).json({ success: false, message: 'Full name must be at least 2 characters.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }

  const users = db.getUsers();
  const emailTaken = users.some(u => u.email.toLowerCase() === email.toLowerCase());
  if (emailTaken) {
    return res.status(400).json({ success: false, message: 'An account with this email already exists.' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newUser = {
    id: userId,
    fullName,
    email,
    password: passwordHash,
    createdAt: new Date().toISOString()
  };

  db.saveUser(newUser);

  res.status(201).json({
    success: true,
    message: 'Registration successful',
    user: {
      id: newUser.id,
      fullName: newUser.fullName,
      email: newUser.email
    }
  });
});

// User Login
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  const users = db.getUsers();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(400).json({ success: false, message: 'Invalid email or password.' });
  }

  const passwordMatch = bcrypt.compareSync(password, user.password);
  if (!passwordMatch) {
    return res.status(400).json({ success: false, message: 'Invalid email or password.' });
  }

  const token = jwt.sign(
    { id: user.id, fullName: user.fullName, email: user.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  res.json({
    success: true,
    message: 'Login successful',
    token,
    user: {
      id: user.id,
      fullName: user.fullName,
      email: user.email
    }
  });
});

/* =========================================================
   BLOG ENDPOINTS
   ========================================================= */

// Get all published blogs (Public)
app.get('/api/blogs', (req, res) => {
  const blogs = db.getBlogs()
    .filter(b => b.status === 'published')
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(blogs);
});

// Get currently logged-in user's blogs (Protected)
app.get('/api/blogs/my', authMiddleware, (req, res) => {
  const blogs = db.getBlogs()
    .filter(b => b.authorId === req.user.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(blogs);
});

// Get a single blog by ID (Public for published, owner-only check for drafts)
app.get('/api/blogs/:id', (req, res) => {
  const blog = db.getBlogs().find(b => b.id === req.params.id);
  if (!blog) {
    return res.status(404).json({ success: false, message: 'Blog not found.' });
  }

  if (blog.status === 'draft') {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (blog.authorId !== decoded.id) {
        return res.status(403).json({ success: false, message: 'Access denied.' });
      }
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Access denied.' });
    }
  }

  res.json(blog);
});

// Create a new blog post (Protected)
app.post('/api/blogs', authMiddleware, (req, res) => {
  const { title, category, image, content, status } = req.body;
  if (!title || !category || !content || !status) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  const blogId = `blog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const newBlog = {
    id: blogId,
    title,
    category,
    image: image || `https://picsum.photos/seed/${encodeURIComponent(title)}/800/500`,
    content,
    status, // 'published' | 'draft'
    authorId: req.user.id,
    authorName: req.user.fullName,
    createdAt: new Date().toISOString()
  };

  db.saveBlog(newBlog);
  res.status(201).json(newBlog);
});

// Update a blog post (Protected)
app.put('/api/blogs/:id', authMiddleware, (req, res) => {
  const blog = db.getBlogs().find(b => b.id === req.params.id);
  if (!blog) {
    return res.status(404).json({ success: false, message: 'Blog not found.' });
  }

  if (blog.authorId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only edit your own blogs.' });
  }

  const { title, category, image, content, status } = req.body;
  const updates = {};
  if (title !== undefined) updates.title = title;
  if (category !== undefined) updates.category = category;
  if (image !== undefined) updates.image = image || `https://picsum.photos/seed/${encodeURIComponent(title || blog.title)}/800/500`;
  if (content !== undefined) updates.content = content;
  if (status !== undefined) updates.status = status;

  const updatedBlog = db.updateBlog(req.params.id, updates);
  res.json(updatedBlog);
});

// Delete a blog post (Protected)
app.delete('/api/blogs/:id', authMiddleware, (req, res) => {
  const blog = db.getBlogs().find(b => b.id === req.params.id);
  if (!blog) {
    return res.status(404).json({ success: false, message: 'Blog not found.' });
  }

  if (blog.authorId !== req.user.id) {
    return res.status(403).json({ success: false, message: 'You can only delete your own blogs.' });
  }

  db.deleteBlog(req.params.id);
  res.json({ success: true, message: 'Blog deleted successfully.' });
});

// Catch-all route to serve index.html for undefined routes (supporting routing style)
app.get('*all', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
