// Diagnostic script to check gallery URLs
// Add this to your backend temporarily to debug

const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

mongoose.connect(process.env.MONGO_URI);

const GalleryItem = require('./models/GalleryItem');

app.get('/api/debug/gallery-urls', async (req, res) => {
  try {
    const items = await GalleryItem.find().limit(5);
    res.json({
      count: items.length,
      items: items.map(item => ({
        title: item.title,
        img_url: item.img,
        is_cloudinary: item.img ? item.img.includes('cloudinary') : false,
        url_length: item.img ? item.img.length : 0
      }))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`Debug server running on port ${PORT}`);
  console.log(`Check: http://localhost:${PORT}/api/debug/gallery-urls`);
});
