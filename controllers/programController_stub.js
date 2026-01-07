// @desc    Get data for the logged-in student's program
// @route   GET /api/programs/student/my-program
// @access  Private (Student only)
exports.getStudentProgram = async (req, res) => {
    try {
        // req.user.id comes from the token. We need to find the user to get their program ID
        // We import User here to avoid circular dependency issues at top level if possible, or just use the model
        const User = require('../models/User'); 
        
        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        if (!user.program) {
            return res.status(404).json({ msg: 'You are not enrolled in any program.' });
        }

        const program = await Program.findById(user.program).populate('instructor', 'name email');
        if (!program) {
            return res.status(404).json({ msg: 'Program not found' });
        }

        res.json(program);
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
