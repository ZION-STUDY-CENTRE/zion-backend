const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Image Optimization Utility
 * 
 * Advanced image optimization using Sharp:
 * - Multiple format support (JPEG, WebP, PNG)
 * - Responsive image generation
 * - Automatic quality optimization
 * - Metadata stripping for smaller files
 * - Format-specific optimizations
 * 
 * Bandwidth Savings:
 * - WebP: 25-35% smaller than JPEG
 * - JPEG: 10-20% smaller with mozjpeg
 * - Progressive JPEG: Better perceived loading
 * - Auto format selection: Chooses best format per browser
 */

/**
 * Optimize an image buffer with format selection
 * 
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {Object} options - Optimization options
 * @param {string} options.type - Image type ('blog', 'gallery', 'testimonial')
 * @param {string} options.format - Output format ('jpeg', 'webp', 'png', 'auto')
 * @param {boolean} options.progressive - Use progressive JPEG
 * @returns {Promise<{buffer: Buffer, format: string, details: Object}>} - Optimized image with metadata
 */
async function optimizeImage(imageBuffer, options = {}) {
    try {
        const { 
            type = 'default', 
            format = 'auto',
            progressive = true 
        } = options;
        
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
        const originalSize = imageBuffer.length;
        const originalMetadata = await sharp(imageBuffer).metadata();

        // Determine output format
        let outputFormat = format === 'auto' ? 'jpeg' : format;

        // Resize and optimize based on format
        let pipeline = sharp(imageBuffer, { failOnError: false })
            .rotate() // Auto-rotate based on EXIF
            .withMetadata(false) // Remove metadata for smaller size
            .resize(config.width, config.height, {
                fit: config.fit,
                position: 'center',
                withoutEnlargement: true
            });

        let optimizedBuffer;
        let finalFormat;

        switch (outputFormat.toLowerCase()) {
            case 'webp':
                // WebP format: 25-35% smaller than JPEG
                // Best for modern browsers
                optimizedBuffer = await pipeline
                    .webp({ 
                        quality: config.quality,
                        alphaQuality: config.quality,
                        lossless: false,
                        effort: 6 // Highest compression effort
                    })
                    .toBuffer();
                finalFormat = 'webp';
                break;

            case 'png':
                // PNG format: Lossless compression
                // Best for images with transparency or text
                optimizedBuffer = await pipeline
                    .png({
                        quality: config.quality,
                        compressionLevel: 9, // Maximum compression
                        adaptiveFiltering: true
                    })
                    .toBuffer();
                finalFormat = 'png';
                break;

            case 'jpeg':
            default:
                // JPEG format: Universal support
                // mozjpeg provides better compression than standard JPEG
                optimizedBuffer = await pipeline
                    .jpeg({
                        quality: config.quality,
                        progressive: progressive, // Progressive JPEG for better perceived loading
                        mozjpeg: true // Better compression
                    })
                    .toBuffer();
                finalFormat = 'jpeg';
        }

        const optimizedSize = optimizedBuffer.length;
        const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);
        const optimizedMetadata = await sharp(optimizedBuffer).metadata();

        console.log(`[Image Optimization] 
            Type: ${type}
            Format: ${finalFormat.toUpperCase()}
            Original: ${(originalSize / 1024).toFixed(2)}KB (${originalMetadata.width}x${originalMetadata.height})
            Optimized: ${(optimizedSize / 1024).toFixed(2)}KB (${optimizedMetadata.width}x${optimizedMetadata.height})
            Reduction: ${reduction}%
        `);

        return {
            buffer: optimizedBuffer,
            format: finalFormat,
            details: {
                originalSize,
                optimizedSize,
                reduction: parseFloat(reduction),
                originalDimensions: {
                    width: originalMetadata.width,
                    height: originalMetadata.height
                },
                optimizedDimensions: {
                    width: optimizedMetadata.width,
                    height: optimizedMetadata.height
                }
            }
        };
    } catch (error) {
        console.error('Error optimizing image:', error);
        throw new Error(`Image optimization failed: ${error.message}`);
    }
}

/**
 * Generate multiple format versions of an image
 * Returns JPEG and WebP for automatic format selection
 * 
 * @param {Buffer} imageBuffer - The image file buffer
 * @param {Object} options - Optimization options
 * @returns {Promise<Object>} - Object with different format versions
 */
async function generateMultiFormatImages(imageBuffer, options = {}) {
    try {
        const { type = 'default' } = options;

        const [jpegResult, webpResult] = await Promise.all([
            optimizeImage(imageBuffer, { type, format: 'jpeg' }),
            optimizeImage(imageBuffer, { type, format: 'webp' })
        ]);

        return {
            jpeg: jpegResult.buffer,
            webp: webpResult.buffer,
            details: {
                jpeg: jpegResult.details,
                webp: webpResult.details,
                recommendation: webpResult.details.optimizedSize < jpegResult.details.optimizedSize 
                    ? 'Use WebP for modern browsers, JPEG fallback'
                    : 'Use JPEG with WebP fallback'
            }
        };
    } catch (error) {
        console.error('Error generating multi-format images:', error);
        throw new Error(`Multi-format generation failed: ${error.message}`);
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
            // Thumbnail - small & highly compressed
            thumbnail: `${basePath}/upload/w_200,h_200,c_fill,q_auto:eco,f_auto/${publicId}`,
            // Small - 400px with eco quality
            small: `${basePath}/upload/w_400,h_400,c_fill,q_auto:eco,f_auto/${publicId}`,
            // Medium - 600px with good quality
            medium: `${basePath}/upload/w_600,h_600,c_fill,q_auto:good,f_auto/${publicId}`,
            // Large - 1000px with best quality
            large: `${basePath}/upload/w_1000,c_scale,q_auto:good,f_auto/${publicId}`,
            // Blurred placeholder for LQIP effect
            blur: `${basePath}/upload/w_100,h_100,c_fill,q_auto:eco,f_auto,e_blur:1000/${publicId}`,
            // Original
            original: cloudinaryUrl
        };
    } catch (error) {
        console.error('Error generating responsive URLs:', error);
        return { original: cloudinaryUrl };
    }
}

/**
 * Get optimization stats
 * Returns information about optimization settings
 */
function getOptimizationStats() {
    return {
        formats: {
            webp: 'Recommended for modern browsers (25-35% smaller)',
            jpeg: 'Universal support with mozjpeg optimization',
            png: 'Lossless compression for transparency'
        },
        cloudinaryTransforms: {
            'q_auto': 'Automatic quality based on image content',
            'f_auto': 'Automatic format selection (WebP for supported browsers)',
            'c_auto': 'Automatic cropping based on content',
            'e_blur': 'Blur effect for LQIP placeholders'
        }
    };
}

module.exports = {
    optimizeImage,
    generateMultiFormatImages,
    validateImageSize,
    getResponsiveImageUrls,
    getOptimizationStats
};
