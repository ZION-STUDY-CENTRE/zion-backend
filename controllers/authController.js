const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Helper to generate JWT
const generateToken = (user) => {
  return jwt.sign(
    { user: { id: user.id, role: user.role } },
    process.env.JWT_SECRET,
    { expiresIn: '24h' }
  );
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    // Check Automation Logic: Student Expiration
    if (user.role === 'student') {
      const currentDate = new Date();
      const enrollment = new Date(user.enrollmentDate);
      const duration = user.programDuration || 3;
      
      let expirationDate = new Date(enrollment);

      // Support fractional months
      const wholeMonths = Math.floor(duration);
      expirationDate.setMonth(expirationDate.getMonth() + wholeMonths);

      const fractionalMonths = duration - wholeMonths;
      if (fractionalMonths > 0) {
        // 1 Month = 30 * 24 * 60 * 60 * 1000 = 2,592,000,000 ms
        expirationDate = new Date(expirationDate.getTime() + (fractionalMonths * 2592000000));
      }

      if (currentDate > expirationDate) {
        user.isActive = false;
        await user.save();
        return res.status(403).json({ 
          msg: 'Your access has expired. Please register again to continue accessing the portal.' 
        });
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ msg: 'Account is deactivated. Contact admin.' });
    }

    const token = generateToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isFirstLogin: user.isFirstLogin,
        program: user.program
      }
    });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Register a new user (Admin only)
// @route   POST /api/auth/register
// @access  Private (Admin only)
exports.registerUser = async (req, res) => {
  // mapped 'enrolledProgram' to 'program' mostly for consistency with frontend
  const { name, email, role, enrolledProgram, durationMonths } = req.body;

  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ msg: 'User already exists' });
    }

    // Default password as per requirement
    const passwordToSave = 'zion123'; 
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(passwordToSave, salt);

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      program: enrolledProgram || undefined, // Map enrolledProgram to program
      programDuration: durationMonths || 3, // Set student specific duration
      isFirstLogin: true 
    });

    await user.save();

    res.json({ msg: 'User registered successfully with default password (zion123)', user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};

// @desc    Change Password (For first time login or manual change)
// @route   POST /api/auth/change-password
// @access  Private
exports.changePassword = async (req, res) => {
  const { newPassword } = req.body;

  try {
    const user = await User.findById(req.user.id);

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    user.isFirstLogin = false;

    await user.save();
    res.json({ msg: 'Password updated successfully' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
};
