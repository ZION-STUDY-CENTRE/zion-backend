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

        // If programs array is provided, update it
        if (Array.isArray(programs)) {
            user.programs = programs.map(p => ({
                program: p.program,
                duration: p.duration || 3,
                enrollmentDate: p.enrollmentDate || Date.now()
            }));
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
    const { durationMonths } = req.body;
    try {
        let user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.enrollmentDate = Date.now(); // Reset enrollment to Now
        user.programDuration = durationMonths || 3; // Set new duration
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