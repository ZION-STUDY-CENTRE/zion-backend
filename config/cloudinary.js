const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
require('dotenv').config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

const path = require('path');
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        // Dynamic folder based on query parameter 'category'
        const category = req.query.category || 'general';
        // Detect file type by mimetype
        const imageMimes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp', 'image/bmp', 'image/svg+xml'];
        const isImage = imageMimes.includes(file.mimetype);
        // Always preserve original filename for non-images
        let public_id;
        if (!isImage) {
            // Remove extension from originalname for public_id, then add extension back
            const ext = path.extname(file.originalname);
            const base = path.basename(file.originalname, ext);
            public_id = `zion_${category}/${base}${ext}`;
        }
        return {
            folder: `zion_${category}`,
            resource_type: isImage ? 'image' : 'raw',
            public_id: !isImage ? public_id : undefined,
            // For images, let Cloudinary handle naming
        };
    },
});

const parser = multer({ storage: storage });

module.exports = {
    cloudinary,
    parser
};