const BlogPost = require("../models/BlogPost");

// @desc    Get all blog posts
// @route   GET /api/blog
// @access  Public
exports.getBlogPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ timestamp: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Get a single blog post
// @route   GET /api/blog/:id
// @access  Public
exports.getBlogPost = async (req, res) => {
  try {
    const post = await BlogPost.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: "Post not found" });
    }
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Create a blog post
// @route   POST /api/blog
// @access  Private (Admin)
exports.createBlogPost = async (req, res) => {
  try {
    // Only require title and url for social-media-post, else require all default fields
    const {
      type,
      title,
      url,
      platform,
      department,
      description,
      shortDescription,
      image,
    } = req.body;
    let postData = { type, title };
    if (type === "social-media-post") {
      postData.url = url;
      postData.platform = platform;
    } else {
      postData.department = department;
      postData.description = description;
      postData.shortDescription = shortDescription;
      postData.image = image;
    }
    const newPost = new BlogPost(postData);
    const post = await newPost.save();
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Update a blog post
// @route   PUT /api/blog/:id
// @access  Private (Admin)
exports.updateBlogPost = async (req, res) => {
  try {
    let post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    // Only allow updating url for social-media-post, else allow all default fields
    const {
      type,
      title,
      url,
      platform,
      department,
      description,
      shortDescription,
      image,
    } = req.body;
    let updateData = { type, title };
    if (type === "social-media-post") {
      updateData.url = url;
      updateData.platform = platform;
    } else {
      updateData.department = department;
      updateData.description = description;
      updateData.shortDescription = shortDescription;
      updateData.image = image;
    }
    post = await BlogPost.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      { new: true },
    );
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blog/:id
// @access  Private (Admin)
exports.deleteBlogPost = async (req, res) => {
  try {
    let post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    await BlogPost.findByIdAndDelete(req.params.id);
    res.json({ msg: "Post removed" });
  } catch (err) {
    console.error(err.message);
    res.status(500).send("Server error");
  }
};
