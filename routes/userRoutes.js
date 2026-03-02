const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');

// Get students by program ID (Instructors need to see their students)
router.get('/program/:programId', [authMiddleware, roleMiddleware('admin', 'instructor')],
    userController.getStudentsByProgram
);

// Assign program to instructor (Admin only)
router.put('/assign-program/:instructorId', [authMiddleware, roleMiddleware('admin')],
    userController.assignProgramToInstructor
);

// Get all instructors (For Admin to assign them)
router.get('/instructors', [authMiddleware, roleMiddleware('admin')],
    userController.getInstructors
);

// Get all users (Admin only)
router.get('/', [authMiddleware, roleMiddleware('admin')],
    userController.getAllUsers
);

// Change own password
router.put('/change-password',
    authMiddleware,
    userController.changeOwnPassword
);

// Update Push Token
router.put('/push-token',
    authMiddleware,
    userController.updatePushToken
);

// Update user details (Admin only)
router.put('/:id', [authMiddleware, roleMiddleware('admin')],
    userController.updateUser
);

// Reactivate user (Admin only)
router.put('/:id/reactivate', [authMiddleware, roleMiddleware('admin')],
    userController.reactivateUser
);

// Pause user (Admin only)
router.put('/:id/pause', [authMiddleware, roleMiddleware('admin')],
    userController.pauseUser
);

// Unpause user (Admin only)
router.put('/:id/unpause', [authMiddleware, roleMiddleware('admin')],
    userController.unpauseUser
);

// Deactivate user (Admin only)
router.put('/:id/deactivate', [authMiddleware, roleMiddleware('admin')],
    userController.deactivateUser
);

// Delete user (Admin only)
router.delete('/:id', [authMiddleware, roleMiddleware('admin')],
    userController.deleteUser
);

module.exports = router;