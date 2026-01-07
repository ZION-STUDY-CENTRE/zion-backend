const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Public Routes
router.post('/login', authController.login);

// Protected Routes
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
