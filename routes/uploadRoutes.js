const express = require('express');
const router = express.Router();
const { parser } = require('../config/cloudinary');
const auth = require('../middleware/authMiddleware');

router.post('/', auth, (req, res) => {
  const upload = parser.single('image');
  
  upload(req, res, (err) => {
    if (err) {
      console.error('Cloudinary Upload Error:', err);
      // Handle DNS/Network errors specifically
      if (err.code === 'EAI_AGAIN' || err.code === 'ENOTFOUND') {
         return res.status(503).json({ message: 'Upload service temporarily unavailable. Please check your internet connection and try again.' });
      }
      return res.status(500).json({ message: 'Image upload failed', error: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    res.json({
      message: 'Image uploaded successfully',
      imageUrl: req.file.path, // Cloudinary URL
      public_id: req.file.filename
    });
  });
});

module.exports = router;
