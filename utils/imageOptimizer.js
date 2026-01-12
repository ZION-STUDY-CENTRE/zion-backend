const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Optimize an image buffer using Sharp
 * Resizes, compresses, and converts to WebP when possible
 * 
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {Object} options - Optimization options
 * @param {string} options.type - Image type ('blog', 'gallery', 'testimonial')
 * @returns {Promise<Buffer>} - Optimized image buffer
 */
async function optimizeImage(imageBuffer, options = {}) {
    try {
        const { type = 'default' } = options;
        
        // Define optimization settings by type
        const settings = {
            blog: {
                width: 1200,
                height: 600,
                quality: 85,
                fit: 'cover'
            },
            gallery: {
                width: 600,
                height: 600,
                quality: 80,
                fit: 'cover'
            },
            testimonial: {
                width: 200,
                height: 200,
                quality: 85,
                fit: 'cover'
            },
            default: {
                width: 1000,
                height: 1000,
                quality: 80,
                fit: 'inside'
            }
        };

        const config = settings[type] || settings.default;

        // Optimize image using sharp
        let optimizedImage = sharp(imageBuffer)
            .resize(config.width, config.height, {
                fit: config.fit,
                position: 'center',
                withoutEnlargement: true
            })
            .jpeg({ quality: config.quality, progressive: true });

        const optimizedBuffer = await optimizedImage.toBuffer();

        // Check file size reduction
        const originalSize = imageBuffer.length;
        const optimizedSize = optimizedBuffer.length;
        const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

        console.log(`Image optimized: ${(originalSize / 1024).toFixed(2)}KB → ${(optimizedSize / 1024).toFixed(2)}KB (${reduction}% reduction)`);

        return optimizedBuffer;
    } catch (error) {
        console.error('Error optimizing image:', error);
        throw new Error(`Image optimization failed: ${error.message}`);
    }
}

/**
 * Validate image file size before optimization
 * Sets a limit to prevent excessively large uploads
 * 
 * @param {number} fileSizeBytes - File size in bytes
 * @param {number} maxSizeBytes - Maximum allowed size (default 50MB)
 * @returns {Object} - Validation result with status and message
 */
function validateImageSize(fileSizeBytes, maxSizeBytes = 50 * 1024 * 1024) {
    if (fileSizeBytes > maxSizeBytes) {
        return {
            valid: false,
            message: `File size exceeds limit. Max: ${(maxSizeBytes / 1024 / 1024).toFixed(2)}MB, Got: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`
        };
    }
    return {
        valid: true,
        message: 'File size is within acceptable range'
    };
}

/**
 * Create responsive image URLs for Cloudinary
 * Generates multiple sizes for lazy loading and responsive images
 * 
 * @param {string} cloudinaryUrl - Original Cloudinary image URL
 * @param {Object} options - Options for transformation
 * @returns {Object} - Object with multiple sized image URLs
 */
function getResponsiveImageUrls(cloudinaryUrl, options = {}) {
    if (!cloudinaryUrl) return null;

    try {
        // Extract public_id from cloudinary URL
        // Cloudinary URL format: https://res.cloudinary.com/[cloud_name]/image/upload/[transformations]/[public_id]
        const urlParts = cloudinaryUrl.split('/upload/');
        if (urlParts.length !== 2) return { original: cloudinaryUrl };

        const basePath = urlParts[0];
        const publicId = urlParts[1];

        return {
            thumbnail: `${basePath}/upload/w_200,h_200,c_fill,q_auto:eco,f_auto/${publicId}`,
            small: `${basePath}/upload/w_400,h_400,c_fill,q_auto:good,f_auto/${publicId}`,
            medium: `${basePath}/upload/w_600,h_600,c_fill,q_auto:good,f_auto/${publicId}`,
            large: `${basePath}/upload/w_1000,c_scale,q_auto:good,f_auto/${publicId}`,
            original: cloudinaryUrl
        };
    } catch (error) {
        console.error('Error generating responsive URLs:', error);
        return { original: cloudinaryUrl };
    }
}

module.exports = {
    optimizeImage,
    validateImageSize,
    getResponsiveImageUrls
};
