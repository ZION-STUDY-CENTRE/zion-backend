const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

// Helper to generate Access Token (JWT)
const generateAccessToken = (user) => {
  const payload = {
    user: {
      id: user.id,
      role: user.role
    }
  };
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '15m' }); // Short-lived
};

// Helper to generate Refresh Token (Opaque + DB)
const generateRefreshToken = async (user, ipAddress) => {
    const token = crypto.randomBytes(40).toString('hex');
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 Days

    const refreshToken = new RefreshToken({
        user: user.id,
        token,
        expires,
        createdByIp: ipAddress
    });
    await refreshToken.save();
    return token;
};

// Helper to set cookies
const setTokenCookies = (res, accessToken, refreshToken) => {
    // Access Token Cookie (Short lived)
    res.cookie('accessToken', accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax', // Lax is better for staying logged in during navigation, but None required for cross-site
        maxAge: 10 * 60 * 1000 // 10 minutes
    });

    // Refresh Token Cookie (Long lived)
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/auth/refresh', // Restricted path
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });
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

    const accessToken = generateAccessToken(user);
    const refreshToken = await generateRefreshToken(user, req.ip);

    setTokenCookies(res, accessToken, refreshToken);

    res.json({
        msg: 'Login successful',
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

// @desc    Log out user / Clear cookie
// @route   POST /api/auth/logout
// @access  Public
exports.logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;
    if (refreshToken) {
        await RefreshToken.findOneAndDelete({ token: refreshToken }); // Simply remove it or mark revoked
    }

    res.clearCookie('accessToken');
    res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
    
    // Also clear the old 'token' cookie just in case (migration)
    res.clearCookie('token'); 
    
    res.json({ msg: 'Logged out successfully' });
};

// @desc    Refresh Access Token
// @route   POST /api/auth/refresh
// @access  Public (Cookie based)
exports.refreshToken = async (req, res) => {
    const token = req.cookies.refreshToken;

    if (!token) {
        return res.status(401).json({ msg: 'Token required' });
    }

    try {
        const rToken = await RefreshToken.findOne({ token }).populate('user');

        if (!rToken || !rToken.isActive) {
            // If token found but revoked -> Security Alert (Reuse Attempt)
            if (rToken && rToken.revoked) {
                 console.warn(`[Security] Revoked refresh token reuse attempt for user ${rToken.user?._id || 'unknown'}`);
                 // Optional: Revoke all tokens for this user
            }
            res.clearCookie('accessToken');
            res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
            return res.status(401).json({ msg: 'Invalid token' });
        }

        const { user } = rToken;
        if (!user) {
             return res.status(401).json({ msg: 'User not found' });
        }

        // Rotation Logic
        // 1. Revoke current refresh token
        rToken.revoked = Date.now();
        const newRefreshTokenString = crypto.randomBytes(40).toString('hex');
        rToken.replacedByToken = newRefreshTokenString;
        await rToken.save();

        // 2. Generate new tokens
        const newAccessToken = generateAccessToken(user);
        
        // 3. Save new Refresh Token
        const newRTokenDoc = new RefreshToken({
            user: user._id,
            token: newRefreshTokenString,
            expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 Days
        });
        await newRTokenDoc.save();

        // 4. Send cookies
        setTokenCookies(res, newAccessToken, newRefreshTokenString);

        res.json({ msg: 'Refreshed' });

    } catch (err) {
        console.error("Refresh Logic Error:", err);
        res.status(500).send('Server Error'); 
    }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
exports.getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        res.json(user);
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
