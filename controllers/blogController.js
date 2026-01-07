const BlogPost = require('../models/BlogPost');

// @desc    Get all blog posts
// @route   GET /api/blog
// @access  Public
exports.getBlogPosts = async (req, res) => {
  try {
    const posts = await BlogPost.find().sort({ timestamp: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Create a blog post
// @route   POST /api/blog
// @access  Private (Admin)
exports.createBlogPost = async (req, res) => {
  try {
    const newPost = new BlogPost(req.body);
    const post = await newPost.save();
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Update a blog post
// @route   PUT /api/blog/:id
// @access  Private (Admin)
exports.updateBlogPost = async (req, res) => {
  try {
    let post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    post = await BlogPost.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true });
    res.json(post);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Delete a blog post
// @route   DELETE /api/blog/:id
// @access  Private (Admin)
exports.deleteBlogPost = async (req, res) => {
  try {
    let post = await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: 'Post not found' });

    await BlogPost.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Post removed' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
