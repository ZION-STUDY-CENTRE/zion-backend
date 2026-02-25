const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async(req, file) => {
        // Dynamic folder based on query parameter 'category'
        // E.g., /api/upload?category=blog -> folder: zion_blog
        const category = req.query.category || 'general';
        // Detect file type by mimetype
        const imageMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
        const isImage = imageMimes.includes(file.mimetype);
        return {
            folder: `zion_${category}`,
            resource_type: isImage ? 'image' : 'raw',
        };
    },
});

const parser = multer({ storage: storage });

module.exports = {
    cloudinary,
    parser
};