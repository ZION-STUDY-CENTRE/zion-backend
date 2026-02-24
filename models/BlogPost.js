const mongoose = require('mongoose');

const BlogPostSchema = new mongoose.Schema({
    type: {
        type: String,
        required: true,
        enum: ['upcoming-event', 'ongoing-activity', 'social-media-post']
    },
    department: {
        type: String,
        required: function() { return this.type !== 'social-media-post'; }
    },
    title: {
        type: String,
        required: true
    },
    url: {
        type: String,
        required: function() { return this.type === 'social-media-post'; }
    },
    platform: {
        type: String,
        enum: ['facebook', 'instagram', 'youtube', 'tiktok'],
        required: function() { return this.type === 'social-media-post'; }
    },
    description: {
        type: String,
        required: function() { return this.type !== 'social-media-post'; }
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