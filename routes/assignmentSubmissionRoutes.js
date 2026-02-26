// Download submission file by submissionId
const axios = require('axios');
const path = require('path');
const express = require('express');
const router = express.Router();
const AssignmentSubmission = require('../models/AssignmentSubmission');
const Assignment = require('../models/Assignment');
const authMiddleware = require('../middleware/authMiddleware');



router.get('/:submissionId/download', authMiddleware, async(req, res) => {
    try {
        const { submissionId } = req.params;
        const submission = await AssignmentSubmission.findById(submissionId);
        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }
        if (!submission.submissionFile) {
            return res.status(404).json({ message: 'No file found for this submission' });
        }
        const fileUrl = submission.submissionFile;
        const fileName = submission.fileName || `submission_${submissionId}`;
        const extension = submission.extension || path.extname(fileName) || '';
        const downloadFileName = `${fileName}`;
        // Stream from Cloudinary
        const response = await axios({
            url: fileUrl,
            method: 'GET',
            responseType: 'stream'
        });
        res.setHeader('Content-Disposition', `attachment; filename="${downloadFileName}"`);
        res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
        response.data.pipe(res);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Submit assignment
router.post('/:assignmentId/submit', authMiddleware, async(req, res) => {
    try {
        const { assignmentId } = req.params;
        const { submissionText, submissionFile, fileName } = req.body;

        // Check if assignment exists
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        // Check if already submitted
        const existingSubmission = await AssignmentSubmission.findOne({
            assignment: assignmentId,
            student: req.user.id
        });

        if (existingSubmission) {
            return res.status(400).json({ message: 'You have already submitted this assignment' });
        }

        // Check if late
        const now = new Date();
        const isLate = now > new Date(assignment.dueDate);

        // Extract extension from fileName if provided
        let extension = '';
        if (fileName && fileName.lastIndexOf('.') !== -1) {
            extension = fileName.substring(fileName.lastIndexOf('.'));
        }
        const submission = new AssignmentSubmission({
            assignment: assignmentId,
            student: req.user.id,
            submissionText: submissionText || '',
            submissionFile: submissionFile || '',
            fileName: fileName || '',
            extension,
            isLate,
            status: 'submitted'
        });

        await submission.save();
        res.json({ message: 'Assignment submitted successfully', submission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get student's submission for an assignment
router.get('/:assignmentId/my-submission', authMiddleware, async(req, res) => {
    try {
        const { assignmentId } = req.params;

        const submission = await AssignmentSubmission.findOne({
                assignment: assignmentId,
                student: req.user.id
            })
            .populate('assignment')
            .populate('student', 'name email');

        if (!submission) {
            return res.status(404).json({ message: 'No submission found' });
        }

        res.json(submission);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Get all submissions for an assignment (instructor only)
router.get('/:assignmentId/submissions', authMiddleware, async(req, res) => {
    try {
        const { assignmentId } = req.params;

        // Verify instructor owns this assignment
        const assignment = await Assignment.findById(assignmentId);
        if (!assignment) {
            return res.status(404).json({ message: 'Assignment not found' });
        }

        if (assignment.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        const submissions = await AssignmentSubmission.find({ assignment: assignmentId })
            .populate('student', 'name email')
            .sort({ submittedAt: -1 });

        res.json(submissions);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Grade submission (instructor only)
router.put('/:submissionId/grade', authMiddleware, async(req, res) => {
    try {
        const { grade, feedback, status } = req.body;

        const submission = await AssignmentSubmission.findById(req.params.submissionId)
            .populate('assignment');

        if (!submission) {
            return res.status(404).json({ message: 'Submission not found' });
        }

        // Verify instructor
        if (submission.assignment.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Not authorized' });
        }

        submission.grade = grade || submission.grade;
        submission.feedback = feedback || submission.feedback;
        submission.status = status || 'graded';

        await submission.save();
        res.json({ message: 'Submission graded successfully', submission });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = router;