// @desc    Pause a student
// @route   PUT /api/users/:id/pause
// @access  Private (Admin)
exports.pauseUser = async(req, res) => {
    try {
        let user = await User.findById(req.params.id);
        const { programId } = req.body;
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        if (user.role !== 'student') {
            return res.status(400).json({ msg: 'Only students can be paused' });
        }
        let updated = false;
        user.programs = user.programs.map(p => {
            if (String(p.program) === String(programId)) {
                const enrollment = new Date(p.enrollmentDate);
                const now = new Date();
                const msPerDay = 1000 * 60 * 60 * 24;
                const daysPassed = Math.floor((now - enrollment) / msPerDay);
                const daysLeft = Math.max((p.duration * 30) - daysPassed, 0);
                updated = true;
                return {
                    ...p.toObject(),
                    pausedDaysLeft: daysLeft,
                    isPaused: true
                };
            }
            return p;
        });
        if (!updated) {
            return res.status(400).json({ msg: 'Program not found for student' });
        }
        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
// @desc    Unpause a student
// @route   PUT /api/users/:id/unpause
// @access  Private (Admin)
exports.unpauseUser = async(req, res) => {
    try {
        let user = await User.findById(req.params.id);
        const { programId } = req.body;
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        if (user.role !== 'student') {
            return res.status(400).json({ msg: 'Only students can be unpaused' });
        }
        let updated = false;
        user.programs = user.programs.map(p => {
            if (String(p.program) === String(programId) && p.isPaused && p.pausedDaysLeft != null) {
                updated = true;

                // Logic to resume without resetting duration
                // We shift the enrollmentDate forward so that the remaining time equals what was left
                // New Enrollment Date = Now - (Total Duration - Time Left)

                const msPerDay = 1000 * 60 * 60 * 24;
                const totalDurationDays = p.duration * 30; // 30 days per month approximation
                const daysUsed = Math.max(totalDurationDays - p.pausedDaysLeft, 0);
                const newEnrollmentDate = new Date(Date.now() - (daysUsed * msPerDay));

                return {
                    ...p.toObject(),
                    enrollmentDate: newEnrollmentDate,
                    isPaused: false,
                    pausedDaysLeft: null
                };
            }
            return p;
        });
        if (!updated) {
            return res.status(400).json({ msg: 'Program not found or not paused for student' });
        }
        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
// @desc    Deactivate a student
// @route   PUT /api/users/:id/deactivate
// @access  Private (Admin)
exports.deactivateUser = async(req, res) => {
    try {
        let user = await User.findById(req.params.id);
        const { programId } = req.body;
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        if (user.role !== 'student') {
            return res.status(400).json({ msg: 'Only students can be deactivated' });
        }
        let updated = false;
        user.programs = user.programs.map(p => {
            if (String(p.program) === String(programId)) {
                updated = true;
                return {
                    ...p.toObject(),
                    duration: 0
                };
            }
            return p;
        });
        if (!updated) {
            return res.status(400).json({ msg: 'Program not found for student' });
        }
        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
const User = require('../models/User');
const bcrypt = require('bcryptjs');

// @desc    Get students for a specific program
// @route   GET /api/users/program/:programId
// @access  Private (Admin, Instructor)
exports.getStudentsByProgram = async(req, res) => {
    try {
        const students = await User.find({
            role: 'student',
            $or: [
                { 'programs.program': req.params.programId },
                { program: req.params.programId } // fallback for legacy
            ]
        }).select('-password'); // Exclude password from result
        res.json(students);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Assign a program to an instructor
// @route   PUT /api/users/assign-program/:instructorId
// @access  Private (Admin)
exports.assignProgramToInstructor = async(req, res) => {
    try {
        const { programId } = req.body;
        const { instructorId } = req.params;

        if (!programId) {
            return res.status(400).json({ msg: 'Program ID is required' });
        }

        const instructor = await User.findById(instructorId);
        if (!instructor) {
            return res.status(404).json({ msg: 'Instructor not found' });
        }

        if (instructor.role !== 'instructor') {
            return res.status(400).json({ msg: 'User is not an instructor' });
        }

        instructor.program = programId;
        await instructor.save();

        console.log(`✅ Assigned instructor ${instructor.name} to program ${programId}`);
        res.json({ msg: 'Program assigned successfully', instructor });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get all instructors
// @route   GET /api/users/instructors
// @access  Private (Admin)
exports.getInstructors = async(req, res) => {
    try {
        const instructors = await User.find({ role: 'instructor' }).select('-password');
        res.json(instructors);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Get all users
// @route   GET /api/users
// @access  Private (Admin)
exports.getAllUsers = async(req, res) => {
    try {
        const users = await User.find()
            .select('-password')
            .sort({ date: -1 })
            .populate('program', 'title')
            .populate('programs.program', 'title');
        res.json(users);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Update user details (Admin)
// @route   PUT /api/users/:id
// @access  Private (Admin)
exports.updateUser = async(req, res) => {
    const { name, email, password, programs } = req.body;
    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }


        user.name = name || user.name;
        user.email = email || user.email;

        // If programs array is provided, update only the affected programs, preserve others
        if (Array.isArray(programs)) {
            // Build a map of existing programs for quick lookup
            const existingPrograms = new Map((user.programs || []).map(p => [String(p.program), p]));
            user.programs = programs.map(p => {
                const existing = existingPrograms.get(String(p.program));
                return {
                    program: p.program,
                    duration: p.duration || (existing ? existing.duration : 3),
                    // Only update enrollmentDate if explicitly provided, else preserve existing
                    enrollmentDate: p.enrollmentDate || (existing ? existing.enrollmentDate : Date.now())
                };
            });
        }

        if (password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(password, salt);
        }

        await user.save();
        res.json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            programs: user.programs
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Change own password
// @route   PUT /api/users/change-password
// @access  Private (All Users)
exports.changeOwnPassword = async(req, res) => {
    const { currentPassword, newPassword } = req.body;
    try {
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid current password' });
        }

        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        user.isFirstLogin = false; // Assuming password change means they are set up

        await user.save();
        res.json({ msg: 'Password updated successfully' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Reactivate a student account
// @route   PUT /api/users/:id/reactivate
// @access  Private (Admin)
exports.reactivateUser = async(req, res) => {
    const { durationMonths, programs } = req.body;
    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // If multi-programs provided, update only the affected programs, preserve others
        if (Array.isArray(programs) && programs.length > 0) {
            const existingPrograms = new Map((user.programs || []).map(p => [String(p.program), p]));
            user.programs = programs.map(p => {
                const existing = existingPrograms.get(String(p.program));
                return {
                    program: p.program,
                    duration: p.duration || durationMonths || (existing ? existing.duration : 3),
                    // Reactivation: always reset enrollmentDate for affected programs
                    enrollmentDate: Date.now()
                };
            }).concat(
                // Preserve any programs not included in the reactivation payload
                (user.programs || []).filter(p => !programs.some(np => String(np.program) === String(p.program)))
            );
        } else if (user.programs && user.programs.length > 0) {
            // If no new programs provided, do NOT reset all programs; instead, do nothing or optionally allow admin to specify which to reactivate
            // For backward compatibility, you may want to skip this block or log a warning
        } else {
            // Legacy: single program fields
            user.enrollmentDate = Date.now();
            user.programDuration = durationMonths || 3;
        }
        user.isActive = true; // Ensure account is active

        await user.save();
        res.json(user);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Delete a user
// @route   DELETE /api/users/:id
// @access  Private (Admin)
exports.deleteUser = async(req, res) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ msg: 'Cannot delete admin users' });
        }

        await User.findByIdAndDelete(req.params.id);
        res.json({ msg: 'User removed' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// @desc    Update Expo Push Token
// @route   PUT /api/users/push-token
// @access  Private (All Users)
exports.updatePushToken = async(req, res) => {
    const { token } = req.body;
    try {
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.expoPushToken = token;
        await user.save();

        console.log(`Saved push token for ${user.email}`);
        res.json({ msg: 'Push token updated' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};