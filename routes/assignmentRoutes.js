const express = require('express');
const router = express.Router();
const Assignment = require('../models/Assignment');
const User = require('../models/User');
const authMiddleware = require('../middleware/authMiddleware');
const roleMiddleware = require('../middleware/roleMiddleware');
const { createNotification } = require('../controllers/notificationController');
const { getIO } = require('../config/ioInstance');

// Get all assignments for a program
router.get('/program/:programId', authMiddleware, async(req, res) => {
    try {
        const assignments = await Assignment.find({ program: req.params.programId })
            .populate('createdBy', 'name email')
            .sort({ dueDate: -1 });
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get single assignment
router.get('/:id', authMiddleware, async(req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id)
            .populate('createdBy', 'name email');
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }
        res.json(assignment);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Create assignment (instructor only)
router.post('/', authMiddleware, roleMiddleware('instructor', 'admin'), async(req, res) => {
    const { title, description, program, dueDate, scheduledDate, attachments } = req.body;

    try {
        // Get the full user object to access name
        const instructor = await User.findById(req.user.id);

        const assignment = new Assignment({
            title,
            description,
            program,
            createdBy: req.user.id,
            dueDate: new Date(dueDate),
            scheduledDate: new Date(scheduledDate) || new Date(),
            attachments: attachments || [],
            status: 'published'
        });

        const savedAssignment = await assignment.save();
        const populated = await savedAssignment.populate('createdBy', 'name email');

        // Get all students enrolled in this program
        const students = await User.find({ program: program, role: 'student' });
        console.log(`[Assignment Notification] 📚 Created assignment "${title}" for ${students.length} students`);

        // Create notifications for all enrolled students
        for (const student of students) {
            await createNotification(
                student._id,
                'assignment',
                `New Assignment: ${title}`,
                `Mr. ${instructor.name} assigned "${title}"`, {},
                req.user.id,
                savedAssignment._id,
                'Assignment'
            );
        }

        // Emit real-time notification via Socket.io
        const io = getIO();
        if (io) {
            students.forEach(student => {
                io.to(`user:${student._id.toString()}`).emit('notification:assignment-shared', {
                    assignmentId: savedAssignment._id,
                    assignmentTitle: title,
                    instructorName: `Mr. ${instructor.name}`,
                    programId: program,
                    dueDate: dueDate
                });
            });
        }

        res.status(201).json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Update assignment (instructor only)
router.put('/:id', authMiddleware, roleMiddleware('instructor', 'admin'), async(req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if user is the creator or admin
        if (assignment.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized to update this assignment' });
        }

        const { title, description, dueDate, scheduledDate, attachments, status } = req.body;

        if (title) assignment.title = title;
        if (description) assignment.description = description;
        if (dueDate) assignment.dueDate = new Date(dueDate);
        if (scheduledDate) assignment.scheduledDate = new Date(scheduledDate);
        if (attachments) assignment.attachments = attachments;
        if (status) assignment.status = status;

        assignment.updatedAt = Date.now();
        const updated = await assignment.save();
        const populated = await updated.populate('createdBy', 'name email');
        res.json(populated);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
});

// Delete assignment
router.delete('/:id', authMiddleware, roleMiddleware('instructor', 'admin'), async(req, res) => {
    try {
        const assignment = await Assignment.findById(req.params.id);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // I commented this out to allow any instructor delete an assignment belonging to his course not just the creator of the assignment
        // if (assignment.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
        //   return res.status(403).json({ message: 'Not authorized' });
        // }

        await Assignment.findByIdAndDelete(req.params.id);
        res.json({ message: 'Assignment deleted' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;