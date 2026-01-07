const express = require('express');
const router = express.Router();
const programController = require('../controllers/programController');
const authMiddleware = require('../middleware/authMiddleware'); 
const roleMiddleware = require('../middleware/roleMiddleware');
const Program = require('../models/Program'); // Required for the inline function

// Get all programs (Public)
router.get('/', programController.getPrograms);

// --- NEW INSTRUCTOR ROUTE (MUST BE BEFORE /:id) ---
router.get('/instructor', authMiddleware, async (req, res) => {
  try {
    const instructorId = req.user.id;
    // Find all programs where this instructor is in the instructors array
    const programs = await Program.find({
      instructors: instructorId
    }).select('title durationMonths _id');
    
    res.json(programs);
  } catch (error) {
    console.error('Error fetching instructor programs:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get student's assigned program
router.get('/student/my-program', [authMiddleware, roleMiddleware('student')], programController.getStudentProgram);

// Get single program by ID or Code (MUST BE AFTER SPECIFIC ROUTES LIKE /instructor)
router.get('/:id', programController.getProgramById);


// --- PROTECTED ADMIN ROUTES ---

// Create a program
router.post(
  '/', 
  [authMiddleware, roleMiddleware('admin')], 
  programController.createProgram
);

// Add instructor to program
router.put(
    '/:id/instructors',
    [authMiddleware, roleMiddleware('admin')],
    programController.addInstructorToProgram
);

// Update program details
router.put(
    '/:id',
    [authMiddleware, roleMiddleware('admin')],
    programController.updateProgram
);

// Remove instructor from program
router.delete(
    '/:id/instructors/:instructorId',
    [authMiddleware, roleMiddleware('admin')],
    programController.removeInstructorFromProgram
);

// Delete program
router.delete(
    '/:id',
    [authMiddleware, roleMiddleware('admin')],
    programController.deleteProgram
);

module.exports = router;