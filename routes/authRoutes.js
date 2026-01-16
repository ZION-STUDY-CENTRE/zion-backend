const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public Routes
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/refresh', authController.refreshToken);
router.post('/verify-email', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

// Protected Routes
// Get current user
router.get('/me', authMiddleware, authController.getMe);
// Only Admin can register new users
router.post(
  '/register', 
  [authMiddleware, roleMiddleware('admin')], 
  authController.registerUser
);

// Any logged in user can change their password
router.post(
  '/change-password', 
  authMiddleware, 
  authController.changePassword
);

module.exports = router;
