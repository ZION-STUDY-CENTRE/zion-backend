const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['upcoming-event', 'ongoing-activity']
  },
  department: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  shortDescription: {
    type: String
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  image: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('BlogPost', BlogPostSchema);
