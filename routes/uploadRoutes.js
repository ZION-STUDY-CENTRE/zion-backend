const express = require('express');
const router = express.Router();
const { parser } = require('../config/cloudinary');
const auth = require('../middleware/authMiddleware');
const { validateImageSize } = require('../utils/imageOptimizer');

router.post('/', auth, (req, res) => {
  const upload = parser.single('image');
  
  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ Cloudinary Upload Error:', err);
      if (err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND') {
         return res.status(503).json({ message: 'Upload service temporarily unavailable. Please check your internet connection and try again.' });
      }
      return res.status(500).json({ message: 'Image upload failed', error: err.message });
    }

    if (!req.file) {
      console.error('❌ No file received');
      return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
      const category = req.query.category || 'general';

      // Validate file size
      const sizeValidation = validateImageSize(req.file.size);
      if (!sizeValidation.valid) {
        return res.status(400).json({ message: sizeValidation.message });
      }

      // Log complete file object for debugging
      console.log('📤 Complete Cloudinary Response:', JSON.stringify(req.file, null, 2));

      // Try multiple URL properties from Cloudinary response
      const imageUrl = req.file.secure_url || req.file.url || req.file.path;
      
      if (!imageUrl) {
        console.error('❌ No URL properties found in Cloudinary response:', {
          available_keys: Object.keys(req.file),
          secure_url: req.file.secure_url,
          url: req.file.url,
          path: req.file.path
        });
        return res.status(500).json({ 
          message: 'Failed to get image URL from Cloudinary',
          debug: { available_keys: Object.keys(req.file) }
        });
      }

      console.log(`✅ Image uploaded successfully`);
      console.log(`   Category: ${category}`);
      console.log(`   Public ID: ${req.file.public_id}`);
      console.log(`   Size: ${(req.file.size / 1024).toFixed(2)}KB`);
      console.log(`   URL: ${imageUrl}`);
      
      res.json({
        message: 'Image uploaded successfully',
        imageUrl: imageUrl,
        public_id: req.file.public_id,
        size: req.file.size,
        category: category
      });
    } catch (error) {
      console.error('❌ Image processing error:', error);
      res.status(500).json({ message: 'Image processing failed', error: error.message });
    }
  });
});

module.exports = router;
