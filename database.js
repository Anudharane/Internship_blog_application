const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Define User Schema (preserving our custom String ID format compatibility)
const UserSchema = new mongoose.Schema({
  _id: { type: String },
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Define Blog Schema (preserving our custom String ID format compatibility)
const BlogSchema = new mongoose.Schema({
  _id: { type: String },
  title: { type: String, required: true },
  category: { type: String, required: true },
  image: { type: String },
  content: { type: String, required: true },
  status: { type: String, required: true, enum: ['published', 'draft'] },
  authorId: { type: String, required: true },
  authorName: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date }
}, {
  toJSON: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: {
    virtuals: true,
    transform: (doc, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

const User = mongoose.model('User', UserSchema);
const Blog = mongoose.model('Blog', BlogSchema);

// Dynamic seeding logic on connection
async function seedSampleData() {
  try {
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      const salt = bcrypt.genSaltSync(10);
      const demoPasswordHash = bcrypt.hashSync("Demo@1234", salt);
      
      const demoUser = new User({
        _id: "user_demo_1",
        fullName: "Maya Chen",
        email: "maya@blogspace.demo",
        password: demoPasswordHash,
        createdAt: new Date()
      });
      await demoUser.save();
      console.log("Seeded demo user Maya Chen successfully!");
    }

    const blogCount = await Blog.countDocuments();
    if (blogCount === 0) {
      const now = Date.now();
      const day = 1000 * 60 * 60 * 24;
      const sampleBlogs = [
        {
          _id: "blog_seed_1",
          title: "Designing Interfaces People Actually Enjoy Using",
          category: "Design",
          image: "https://picsum.photos/seed/blogspace1/800/500",
          content: "Good interface design is mostly invisible — it disappears into the task at hand. In this post we walk through a handful of principles that separate interfaces people tolerate from interfaces people genuinely enjoy: clear feedback, forgiving forms, and typography that carries meaning rather than just filling space. We also look at small, unglamorous details like focus states and empty-state messaging, which quietly do more for trust than any hero animation.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 6)
        },
        {
          _id: "blog_seed_2",
          title: "A Beginner's Guide to LocalStorage in JavaScript",
          category: "Development",
          image: "https://picsum.photos/seed/blogspace2/800/500",
          content: "LocalStorage is one of the simplest ways to persist data in the browser without a backend. In this guide we cover how to save, read, update and delete data with plain JavaScript, why everything is stored as a string, and common pitfalls like forgetting to JSON.stringify an object before saving it. By the end you'll be comfortable using LocalStorage to power small projects like this very blog application.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 4)
        },
        {
          _id: "blog_seed_3",
          title: "Why Slow Mornings Make for Better Writing",
          category: "Lifestyle",
          image: "https://picsum.photos/seed/blogspace3/800/500",
          content: "There's a strange myth that good writing requires hustle. In practice, some of the clearest thinking happens in unhurried mornings — before notifications start competing for attention. This post is a short reflection on building a slower morning routine, and how that spare, quiet time tends to show up in the quality of what gets written later in the day.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 2)
        },
        {
          _id: "blog_seed_4",
          title: "Understanding Client-Side Form Validation",
          category: "Development",
          image: "https://picsum.photos/seed/blogspace4/800/500",
          content: "Client-side validation is the first line of defence against bad data, and it's also what makes a form feel responsive and considerate rather than punishing. We break down how to validate required fields, emails and matching passwords using plain JavaScript, and how to surface errors in a way that helps rather than scolds the person filling out the form.",
          authorId: "user_demo_1",
          authorName: "Maya Chen",
          status: "published",
          createdAt: new Date(now - day * 1)
        }
      ];

      for (const blogData of sampleBlogs) {
        const blog = new Blog(blogData);
        await blog.save();
      }
      console.log("Seeded sample blogs successfully!");
    }
  } catch (err) {
    console.error("Error seeding sample data:", err);
  }
}

module.exports = {
  connect: async (uri) => {
    try {
      await mongoose.connect(uri);
      console.log("Connected to MongoDB Atlas successfully");
      await seedSampleData();
    } catch (err) {
      console.error("MongoDB Atlas connection failed:", err.message);
      throw err;
    }
  },
  getUsers: async () => {
    return await User.find();
  },
  getUserByEmail: async (email) => {
    return await User.findOne({ email: email.toLowerCase() });
  },
  saveUser: async (userData) => {
    const user = new User(userData);
    return await user.save();
  },
  getBlogs: async () => {
    return await Blog.find();
  },
  getPublishedBlogs: async (filters = {}) => {
    const query = { status: 'published' };
    if (filters.category && filters.category !== 'All') {
      query.category = filters.category;
    }
    if (filters.search) {
      query.$or = [
        { title: { $regex: filters.search, $options: 'i' } },
        { content: { $regex: filters.search, $options: 'i' } }
      ];
    }
    return await Blog.find(query).sort({ createdAt: -1 });
  },
  getBlogsByUser: async (userId) => {
    return await Blog.find({ authorId: userId }).sort({ createdAt: -1 });
  },
  getBlogById: async (id) => {
    return await Blog.findById(id);
  },
  saveBlog: async (blogData) => {
    const blog = new Blog(blogData);
    return await blog.save();
  },
  updateBlog: async (id, updates) => {
    updates.updatedAt = new Date();
    return await Blog.findByIdAndUpdate(id, updates, { new: true });
  },
  deleteBlog: async (id) => {
    return await Blog.findByIdAndDelete(id);
  },
  resetPassword: async (email, newHashedPassword) => {
    return await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { password: newHashedPassword },
      { new: true }
    );
  }
};
