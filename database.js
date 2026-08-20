const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function initDb() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync("Demo@1234", salt);
    
    const now = Date.now();
    const day = 1000 * 60 * 60 * 24;

    const initialData = {
      users: [
        {
          id: "user_demo_1",
          fullName: "Maya Chen",
          email: "maya@blogspace.demo",
          password: demoPasswordHash,
          createdAt: new Date().toISOString()
        }
      ],
      blogs: [
        {
          id: "blog_seed_1",
          title: "Designing Interfaces People Actually Enjoy Using",
          category: "Design",
          image: "https://picsum.photos/seed/blogspace1/800/500",
          content: "Good interface design is mostly invisible — it disappears into the task at hand. In this post we walk through a handful of principles that separate interfaces people tolerate from interfaces people genuinely enjoy: clear feedback, forgiving forms, and typography that carries meaning rather than just filling space. We also look at small, unglamorous details like focus states and empty-state messaging, which quietly do more for trust than any hero animation.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 6).toISOString()
        },
        {
          id: "blog_seed_2",
          title: "A Beginner's Guide to LocalStorage in JavaScript",
          category: "Development",
          image: "https://picsum.photos/seed/blogspace2/800/500",
          content: "LocalStorage is one of the simplest ways to persist data in the browser without a backend. In this guide we cover how to save, read, update and delete data with plain JavaScript, why everything is stored as a string, and common pitfalls like forgetting to JSON.stringify an object before saving it. By the end you'll be comfortable using LocalStorage to power small projects like this very blog application.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 4).toISOString()
        },
        {
          id: "blog_seed_3",
          title: "Why Slow Mornings Make for Better Writing",
          category: "Lifestyle",
          image: "https://picsum.photos/seed/blogspace3/800/500",
          content: "There's a strange myth that good writing requires hustle. In practice, some of the clearest thinking happens in unhurried mornings — before notifications start competing for attention. This post is a short reflection on building a slower morning routine, and how that spare, quiet time tends to show up in the quality of what gets written later in the day.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 2).toISOString()
        },
        {
          id: "blog_seed_4",
          title: "Understanding Client-Side Form Validation",
          category: "Development",
          image: "https://picsum.photos/seed/blogspace4/800/500",
          content: "Client-side validation is the first line of defence against bad data, and it's also what makes a form feel responsive and considerate rather than punishing. We break down how to validate required fields, emails and matching passwords using plain JavaScript, and how to surface errors in a way that helps rather than scolds the person filling out the form.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 1).toISOString()
        }
      ]
    };

    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

function readData() {
  initDb();
  const raw = fs.readFileSync(DB_FILE, 'utf-8');
  return JSON.parse(raw);
}

function writeData(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
}

module.exports = {
  getUsers: () => {
    return readData().users;
  },
  saveUser: (user) => {
    const data = readData();
    data.users.push(user);
    writeData(data);
    return user;
  },
  getBlogs: () => {
    return readData().blogs;
  },
  saveBlog: (blog) => {
    const data = readData();
    data.blogs.push(blog);
    writeData(data);
    return blog;
  },
  updateBlog: (id, updates) => {
    const data = readData();
    const idx = data.blogs.findIndex(b => b.id === id);
    if (idx === -1) return null;
    data.blogs[idx] = { 
      ...data.blogs[idx], 
      ...updates, 
      updatedAt: new Date().toISOString() 
    };
    writeData(data);
    return data.blogs[idx];
  },
  deleteBlog: (id) => {
    const data = readData();
    data.blogs = data.blogs.filter(b => b.id !== id);
    writeData(data);
    return true;
  }
};
