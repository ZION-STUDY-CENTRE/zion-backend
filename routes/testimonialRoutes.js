const express = require('express');
const router = express.Router();
const testimonialController = require('../controllers/testimonialController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public routes
router.get('/', testimonialController.getAllTestimonials);
router.get('/:id', testimonialController.getTestimonial);

// Protected routes - Media Manager and Admin only
router.post('/', 
    authMiddleware, 
    roleMiddleware('media-manager', 'admin'), 
    testimonialController.createTestimonial
);

router.put('/:id', 
    authMiddleware, 
    roleMiddleware('media-manager', 'admin'), 
    testimonialController.updateTestimonial
);

router.delete('/:id', 
    authMiddleware, 
    roleMiddleware('media-manager', 'admin'), 
    testimonialController.deleteTestimonial
);

// Admin only - view all including unapproved
router.get('/admin/all', 
    authMiddleware, 
    roleMiddleware('admin'), 
    testimonialController.getAllTestimonialsAdmin
);

module.exports = router;
