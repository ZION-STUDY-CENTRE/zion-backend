const express = require('express');
const router = express.Router();
const {
  getBlogPosts,
  createBlogPost,
  updateBlogPost,
  deleteBlogPost
} = require('../controllers/blogController');
const {
  getGalleryItems,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem
} = require('../controllers/galleryController');
const auth = require('../middleware/authMiddleware'); // Assuming you have auth middleware
const roleMiddleware = require('../middleware/roleMiddleware');

// Blog Routes
router.get('/blog', getBlogPosts);
router.post('/blog', auth, roleMiddleware('admin', 'media-manager'), createBlogPost);
router.put('/blog/:id', auth, roleMiddleware('admin', 'media-manager'), updateBlogPost);
router.delete('/blog/:id', auth, roleMiddleware('admin', 'media-manager'), deleteBlogPost);

// Gallery Routes
router.get('/gallery', getGalleryItems);
router.post('/gallery', auth, roleMiddleware('admin', 'media-manager'), createGalleryItem);
router.put('/gallery/:id', auth, roleMiddleware('admin', 'media-manager'), updateGalleryItem);
router.delete('/gallery/:id', auth, roleMiddleware('admin', 'media-manager'), deleteGalleryItem);

module.exports = router;
