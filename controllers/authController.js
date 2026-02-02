const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const RefreshToken = require('../models/RefreshToken');
const axios = require('axios');

// Helper to generate Access Token (JWT)
const generateAccessToken = (user) => {
  const payload = {
    user: {
      _id: user._id,
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
        maxAge: 15 * 60 * 60 * 1000 // 15 hour
    });

    // Refresh Token Cookie (Long lived)
    res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
        path: '/api/auth/refresh', // Restricted path
        maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
};

// Helper: Send Verification Email with Student Login Instructions
const sendVerificationEmail = async (user, token) => {
    const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email?token=${token}`;
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Custom HTML template with student login instructions
    const emailContent = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
                .container { max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9; border-radius: 8px; }
                .header { background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
                .header h1 { margin: 0; font-size: 28px; }
                .content { background: white; padding: 30px; border-radius: 0 0 8px 8px; }
                .section { margin-bottom: 25px; }
                .section-title { font-size: 18px; font-weight: bold; color: #1e3a8a; margin-bottom: 12px; border-bottom: 2px solid #dbeafe; padding-bottom: 8px; }
                .credentials-box { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px; margin: 15px 0; border-radius: 4px; }
                .credentials-box p { margin: 8px 0; }
                .label { font-weight: bold; color: #1e3a8a; }
                .value { font-family: 'Courier New', monospace; color: #2563eb; word-break: break-all; }
                .button-container { text-align: center; margin: 25px 0; }
                .verify-button { display: inline-block; background-color: #1e3a8a; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; transition: background-color 0.3s; }
                .verify-button:hover { background-color: #1e40af; }
                .link-text { color: #3b82f6; word-break: break-all; font-size: 12px; }
                .steps { counter-reset: step-counter; }
                .step { counter-increment: step-counter; margin-bottom: 15px; padding-left: 30px; position: relative; }
                .step::before { content: counter(step-counter); position: absolute; left: 0; top: 0; background-color: #3b82f6; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; }
                .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 15px 0; border-radius: 4px; color: #92400e; }
                .footer { background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
                .footer-link { color: #3b82f6; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <img src="https://raw.githubusercontent.com/ZION-STUDY-CENTRE/zion-frontend/main/public/logo.png" alt="Zion Study Centre Logo" style="width: 60px; height: auto; margin-bottom: 15px;">
                    <h1> Welcome to Zion Study Centre!</h1>
                </div>
                
                <div class="content">
                    <p>Hello <span class="label">${user.name}</span>,</p>
                    
                    <p>Your student account has been successfully created at <strong>Zion Study Centre</strong>. We're excited to have you on board!</p>
                    
                    <!-- Step 1: Verify Email -->
                    <div class="section">
                        <div class="section-title">Step 1: Verify Your Email</div>
                        <p>Please verify your email address to activate your account:</p>
                        <div class="button-container">
                            <a href="${verificationUrl}" class="verify-button">✓ Verify Email Address</a>
                        </div>
                       
                    </div>
                    
                    <!-- Step 2: Login Credentials -->
                    <div class="section">
                        <div class="section-title">Step 2: Login to Your Account</div>
                        <p>After verifying your email, use these credentials to log in:</p>
                        
                        <div class="credentials-box">
                            <p><span class="label">Email:</span><br><span class="value">${user.email}</span></p>
                            <p><span class="label">Default Password:</span><br><span class="value">zion123</span></p>
                        </div>
                        
                        <p>You can access the student portal here: <a href="${frontendUrl}" class="footer-link">${frontendUrl}</a></p>
                    </div>
                    
                    <!-- Getting Started -->
                    <div class="section">
                        <div class="section-title">Getting Started</div>
                        <div class="steps">
                            <div class="step">
                                Verify your email using the button above
                            </div>
                            <div class="step">
                                Log in with your email and the default password
                            </div>
                            <div class="step">
                                Change your password on your first login for security
                            </div>
                            <div class="step">
                                Complete your profile and start your learning journey
                            </div>
                        </div>
                    </div>
                    
                    <!-- Security Warning -->
                    <div class="warning">
                        <strong>⚠️ Security Reminder:</strong> Please change your default password immediately after your first login. Never share your login credentials with anyone.
                    </div>
                    
                    <!-- Support -->
                    <div class="section">
                        <div class="section-title">Need Help?</div>
                        <p>If you have any questions or encounter any issues, please contact our support team:</p>
                        <p>📧 Email: <a href="mailto:support@zionstudycentre.com" class="footer-link">support@zionstudycentre.com</a></p>
                        <p>🌐 Visit our website: <a href="${frontendUrl}" class="footer-link">Zion Study Centre</a></p>
                    </div>
                    
                    <!-- Closing -->
                    <p>Best regards,<br><strong>The Zion Study Centre Team</strong></p>
                </div>
                
                <div class="footer">
                    <p>© 2024-2026 Zion Study Centre. All rights reserved.</p>
                    <p>This email was sent to <span class="label">${user.email}</span> as part of your account verification.</p>
                    <p>If you didn't create this account, please ignore this email.</p>
                </div>
            </div>
        </body>
        </html>
    `;
    
    // Use the same structure as your emailController
    const payload = {
        service_id: process.env.EMAILJS_SERVICE_ID,
        template_id: process.env.EMAILJS_TEMPLATE_ID, // Use your Zion Master Template
        user_id: process.env.EMAILJS_PUBLIC_KEY,
        accessToken: process.env.EMAILJS_PRIVATE_KEY,
        template_params: {
            to_email: user.email,
            from_name: 'ZION STUDY CENTRE',
            subject: "Welcome to Zion Study Centre - Verify Your Email & Login Instructions",
            content: emailContent,
            reply_to: 'admin@zionstudycentre.com'
        }
    };
    
    try {
        await axios.post('https://api.emailjs.com/api/v1.0/email/send', payload);
    } catch (err) {
        console.error("Failed to send verification email:", err.message);
    }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  const { email, password } = req.body;
    console.log("LOCAL BACKEND LOGIN HIT", { email });

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

    // Check Email Verification for Students
    if (user.role === 'student' && !user.isEmailVerified) {
        return res.status(403).json({ 
            msg: 'Email not verified', 
            code: 'EMAIL_NOT_VERIFIED',
            email: user.email 
        });
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

    console.log("LOGIN RESPONSE SENT FROM LOCAL BACKEND", { token: typeof accessToken, user: user.email });
    res.json({
      msg: 'Login successful',
      token: accessToken,
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
  try {
    const refreshToken = req.cookies.refreshToken;

    // Delete refresh token from database
    if (refreshToken) {
      await RefreshToken.findOneAndDelete({ token: refreshToken });
    }

    // Clear all auth cookies with proper options
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', { ...cookieOptions, path: '/api/auth/refresh' });
    res.clearCookie('token', cookieOptions); // Legacy token cookie
    
    res.status(200).json({ msg: 'Logged out successfully' });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ msg: 'Logout failed' });
  }
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

    // Generate Verification Token
    const verificationToken = crypto.randomBytes(20).toString('hex');
    const verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      program: enrolledProgram || undefined, // Map enrolledProgram to program
      programDuration: durationMonths || 3, // Set student specific duration
      isFirstLogin: true,
      // Admins are auto-verified, Students need verification
      isEmailVerified: role === 'student' ? false : true,
      verificationToken: role === 'student' ? verificationToken : undefined,
      verificationTokenExpire: role === 'student' ? verificationTokenExpire : undefined
    });

    await user.save();

    // Send the email immediately for students
    if (role === 'student') {
        await sendVerificationEmail(user, verificationToken);
    }

    res.json({ msg: 'User registered. Verification email sent (if student).', user: { id: user.id, name: user.name, role: user.role } });
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

// --- NEW: Verify Email Endpoint ---
// @route   POST /api/auth/verify-email
exports.verifyEmail = async (req, res) => {
    const { token } = req.body;

    try {
        const user = await User.findOne({
            verificationToken: token,
            verificationTokenExpire: { $gt: Date.now() } // Ensure not expired
        });

        if (!user) {
            return res.status(400).json({ msg: 'Invalid or expired verification token' });
        }

        user.isEmailVerified = true;
        user.verificationToken = undefined;
        user.verificationTokenExpire = undefined;
        await user.save();

        res.json({ msg: 'Email verified successfully. You can now login.' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};

// --- NEW: Resend Verification Email ---
// @route   POST /api/auth/resend-verification
exports.resendVerification = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await User.findOne({ email });
        
        if (!user) return res.status(404).json({ msg: 'User not found' });
        if (user.isEmailVerified) return res.status(400).json({ msg: 'Email already verified' });

        // Generate new token
        const verificationToken = crypto.randomBytes(20).toString('hex');
        user.verificationToken = verificationToken;
        user.verificationTokenExpire = Date.now() + 24 * 60 * 60 * 1000;
        await user.save();

        await sendVerificationEmail(user, verificationToken);
        
        res.json({ msg: 'Verification email resent' });
    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
};
