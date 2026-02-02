/**
 * Image Compression Middleware
 * 
 * Automatically compresses and optimizes images before sending to frontend.
 * Reduces bandwidth usage significantly.
 * 
 * Features:
 * - Automatic image compression using Sharp
 * - Support for multiple formats (JPEG, WebP, PNG)
 * - Responsive image generation
 * - Caching of optimized images
 * - Automatic quality optimization based on format
 * 
 * Usage:
 * app.use('/api/images', compressImageMiddleware, imageRoutes);
 */

const sharp = require('sharp');
const path = require('path');
const NodeCache = require('node-cache');

// Cache for optimized images (1 hour TTL)
const imageCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

/**
 * Compression settings based on image type
 */
const COMPRESSION_SETTINGS = {
  blog: {
    width: 1200,
    height: 600,
    quality: 85,
    fit: 'cover',
    progressive: true,
    format: 'jpeg'
  },
  gallery: {
    width: 600,
    height: 600,
    quality: 80,
    fit: 'cover',
    progressive: true,
    format: 'jpeg'
  },
  thumbnail: {
    width: 300,
    height: 300,
    quality: 75,
    fit: 'cover',
    progressive: true,
    format: 'jpeg'
  },
  testimonial: {
    width: 200,
    height: 200,
    quality: 85,
    fit: 'cover',
    progressive: true,
    format: 'jpeg'
  },
  default: {
    width: 1000,
    height: 1000,
    quality: 80,
    fit: 'inside',
    progressive: true,
    format: 'jpeg'
  }
};

/**
 * Compress and optimize image buffer
 * 
 * @param {Buffer} imageBuffer - The image data
 * @param {string} type - Image type (blog, gallery, etc)
 * @param {string} format - Output format (jpeg, webp, png)
 * @returns {Promise<Buffer>} - Optimized image buffer
 */
async function compressImage(imageBuffer, type = 'default', format = 'jpeg') {
  try {
    const settings = COMPRESSION_SETTINGS[type] || COMPRESSION_SETTINGS.default;
    
    let pipeline = sharp(imageBuffer).resize(settings.width, settings.height, {
      fit: settings.fit,
      position: 'center',
      withoutEnlargement: true
    });

    // Apply format-specific compression
    switch (format.toLowerCase()) {
      case 'webp':
        // WebP is ~25-35% smaller than JPEG
        pipeline = pipeline.webp({ quality: settings.quality, alphaQuality: settings.quality });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: settings.quality, compressionLevel: 9 });
        break;
      case 'jpeg':
      default:
        pipeline = pipeline.jpeg({
          quality: settings.quality,
          progressive: settings.progressive,
          mozjpeg: true // Better compression than standard JPEG
        });
    }

    const optimizedBuffer = await pipeline.toBuffer();
    const originalSize = imageBuffer.length;
    const optimizedSize = optimizedBuffer.length;
    const reduction = ((originalSize - optimizedSize) / originalSize * 100).toFixed(2);

    console.log(`[Image Compression] ${type} (${format}): ${(originalSize / 1024).toFixed(2)}KB → ${(optimizedSize / 1024).toFixed(2)}KB (${reduction}% reduction)`);

    return optimizedBuffer;
  } catch (error) {
    console.error('[Image Compression Error]', error);
    throw error;
  }
}

/**
 * Generate multiple responsive image sizes
 * 
 * @param {Buffer} imageBuffer - Original image
 * @param {string} type - Image type
 * @returns {Promise<Object>} - Object with different sized images
 */
async function generateResponsiveImages(imageBuffer, type = 'default') {
  try {
    const originalMetadata = await sharp(imageBuffer).metadata();
    const images = {};

    // Generate JPEG versions
    images.jpeg = {
      original: await compressImage(imageBuffer, type, 'jpeg'),
      small: await compressImage(imageBuffer, 'thumbnail', 'jpeg')
    };

    // Generate WebP versions (25-35% smaller)
    images.webp = {
      original: await compressImage(imageBuffer, type, 'webp'),
      small: await compressImage(imageBuffer, 'thumbnail', 'webp')
    };

    console.log(`[Responsive Images] Generated ${Object.keys(images).length * 2} image variants for type: ${type}`);

    return {
      jpeg: images.jpeg.original,
      webp: images.webp.original,
      thumbnail: images.jpeg.small,
      metadata: {
        original: { width: originalMetadata.width, height: originalMetadata.height },
        compressed: await sharp(images.jpeg.original).metadata()
      }
    };
  } catch (error) {
    console.error('[Responsive Images Error]', error);
    throw error;
  }
}

/**
 * Express middleware for automatic image compression
 * Compresses images before sending to client
 * 
 * Usage:
 * app.use('/api/images', compressImageMiddleware);
 */
const compressImageMiddleware = (req, res, next) => {
  // Only process GET requests with image data in query
  if (req.method !== 'GET' || !req.query.image) {
    return next();
  }

  const cacheKey = `image_${req.query.image}_${req.query.format || 'jpeg'}`;
  
  // Check cache first
  if (imageCache.has(cacheKey)) {
    const cached = imageCache.get(cacheKey);
    res.set('Content-Type', `image/${req.query.format || 'jpeg'}`);
    res.set('Cache-Control', 'public, max-age=31536000, immutable'); // Cache for 1 year
    res.set('X-Cache', 'HIT');
    return res.send(cached);
  }

  // Pass control to next middleware for actual image compression
  res.set('X-Cache', 'MISS');
  next();
};

/**
 * Middleware to add compression headers for API responses
 * Tells clients which image formats are supported
 */
const imageFormatHeaderMiddleware = (req, res, next) => {
  // Add header indicating supported image formats
  res.set('X-Supported-Formats', 'jpeg, webp, png');
  res.set('X-Image-Optimization', 'enabled');
  next();
};

/**
 * Cache manager utility
 */
const imageCacheManager = {
  /**
   * Store compressed image in cache
   * @param {string} key - Cache key
   * @param {Buffer} imageBuffer - Compressed image data
   */
  set(key, imageBuffer) {
    imageCache.set(key, imageBuffer);
  },

  /**
   * Retrieve image from cache
   * @param {string} key - Cache key
   * @returns {Buffer|null} - Cached image or null
   */
  get(key) {
    return imageCache.get(key);
  },

  /**
   * Clear all cached images
   */
  clear() {
    imageCache.flushAll();
  },

  /**
   * Get cache statistics
   */
  getStats() {
    return imageCache.getStats();
  }
};

module.exports = {
  compressImage,
  generateResponsiveImages,
  compressImageMiddleware,
  imageFormatHeaderMiddleware,
  imageCacheManager,
  COMPRESSION_SETTINGS
};
