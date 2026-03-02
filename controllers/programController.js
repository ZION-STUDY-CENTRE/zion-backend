const Program = require('../models/Program');
const mongoose = require('mongoose');

// Helper to slugify
const slugify = text => text.toString().toLowerCase()
    .replace(/\s+/g, '-') // Replace spaces with -
    .replace(/[^\w\-]+/g, '') // Remove all non-word chars
    .replace(/\-\-+/g, '-') // Replace multiple - with single -
    .replace(/^-+/, '') // Trim - from start of text
    .replace(/-+$/, ''); // Trim - from end of text

// @desc    Create a new program
// @route   POST /api/programs
// @access  Private (Admin only)
exports.createProgram = async(req, res) => {
    try {
        const {
            title,
            shortDescription,
            category,
            description,
            overview,
            heroImage,
            imageUrl,
            keyStats,
            schedule,
            students,
            modules,
            entryRequirements,
            careerOpportunities,
            instructors
        } = req.body;

        // Check if program exists
        let program = await Program.findOne({ title });
        if (program) {
            return res.status(400).json({ msg: 'Program with this title already exists' });
        }

        // Generate code/slug
        const code = slugify(title);

        program = new Program({
            title,
            code,
            category,
            shortDescription,
            description,
            overview,
            heroImage,
            imageUrl,
            keyStats,
            schedule,
            students,
            modules,
            entryRequirements,
            careerOpportunities,
            instructors: Array.isArray(instructors) ? instructors : (instructors ? [instructors] : [])
        });

        await program.save();
        res.json(program);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error: ' + err.message);
    }
};

// @desc    Get all programs
// @route   GET /api/programs
// @access  Public
exports.getPrograms = async(req, res) => {
    try {
        const programs = await Program.find().populate('instructors', 'name email').sort({ createdAt: -1 });
        res.json(programs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get single program by ID or Code
// @route   GET /api/programs/:id
// @access  Public
exports.getProgramById = async(req, res) => {
    try {
        const isObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
        let program;

        if (isObjectId) {
            program = await Program.findById(req.params.id).populate('instructors', 'name email');
        } else {
            program = await Program.findOne({ code: req.params.id }).populate('instructors', 'name email');
        }

        if (!program) {
            return res.status(404).json({ msg: 'Program not found' });
        }
        res.json(program);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};


// @desc    Get programs for current instructor
// @route   GET /api/programs/my-programs
// @access  Private (Instructor only)
exports.getInstructorPrograms = async(req, res) => {
    try {
        const userId = req.user.id;
        // Search for ID as string or ObjectId to cover all bases
        const programs = await Program.find({
            instructors: { $in: [userId, new mongoose.Types.ObjectId(userId)] }
        });
        res.json(programs);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Add Instructor to Program
// @route   PUT /api/programs/:id/instructors
// @access  Private (Admin)
exports.addInstructorToProgram = async(req, res) => {
    try {
        const { instructorId } = req.body;
        const program = await Program.findById(req.params.id);

        if (!program) {
            return res.status(404).json({ msg: 'Program not found' });
        }

        if (program.instructors.includes(instructorId)) {
            return res.status(400).json({ msg: 'Instructor already assigned' });
        }

        program.instructors.push(instructorId);
        await program.save();
        res.json(program);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Update program details
// @route   PUT /api/programs/:id
// @access  Private (Admin)
exports.updateProgram = async(req, res) => {
    try {
        let program = await Program.findById(req.params.id);

        if (!program) {
            return res.status(404).json({ msg: 'Program not found' });
        }

        // Allow updating any field passed in body
        const fieldsToUpdate = [
            'title', 'shortDescription', 'category', 'description', 'overview',
            'heroImage', 'imageUrl', 'keyStats', 'schedule', 'students',
            'modules', 'entryRequirements', 'careerOpportunities'
        ];

        // Handle direct fields
        fieldsToUpdate.forEach(field => {
            if (req.body[field] !== undefined) {
                program[field] = req.body[field];
            }
        });

        // Handle Instructors specially to ensure array replacement works
        if (req.body.instructors) {
            program.instructors = req.body.instructors;
        }

        // Update code if title changed and code wasn't manually provided (optional behavior)
        if (req.body.title && req.body.title !== program.title) {
            program.code = slugify(req.body.title);
        }

        await program.save();
        res.json(program);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Remove Instructor from Program
// @route   DELETE /api/programs/:id/instructors/:instructorId
// @access  Private (Admin)
exports.removeInstructorFromProgram = async(req, res) => {
    try {
        const program = await Program.findById(req.params.id);

        if (!program) {
            return res.status(404).json({ msg: 'Program not found' });
        }

        program.instructors = program.instructors.filter(
            instId => instId.toString() !== req.params.instructorId
        );

        await program.save();
        res.json(program);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Delete a program
// @route   DELETE /api/programs/:id
// @access  Private (Admin)
exports.deleteProgram = async(req, res) => {
    try {
        const program = await Program.findById(req.params.id);
        if (!program) {
            return res.status(404).json({ msg: 'Program not found' });
        }
        await Program.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Program removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get data for the logged-in student's program
// @route   GET /api/programs/student/my-program
// @access  Private (Student only)
exports.getStudentProgram = async(req, res) => {
    try {
        const User = require('../models/User');
        const user = await User.findById(req.user.id).populate('programs.program');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Multi-program support
        if (user.programs && user.programs.length > 0) {
            // Populate instructors for each program
            const programs = await Promise.all(user.programs.map(async(entry) => {
                // Filter out paused or deactivated (duration <= 0) programs from the dashboard
                if ((entry.duration || 0) <= 0 || entry.isPaused) return null;

                const prog = await Program.findById(entry.program._id || entry.program).populate('instructors', 'name email');
                return {
                    program: prog,
                    enrollmentDate: entry.enrollmentDate,
                    duration: entry.duration,
                    isPaused: entry.isPaused,
                    pausedDaysLeft: entry.pausedDaysLeft
                };
            }));

            // Return only active programs
            return res.json(programs.filter(p => p !== null));
        }

        // Legacy: single program field
        if (user.program) {
            const prog = await Program.findById(user.program).populate('instructors', 'name email');
            return res.json({ program: prog, enrollmentDate: user.enrollmentDate, duration: user.programDuration });
        }

        return res.status(404).json({ msg: 'Not enrolled in any program' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};