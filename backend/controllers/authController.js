import crypto from 'crypto';
import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import DoctorProfile from '../models/DoctorProfile.js';
import generateToken from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import { uploadFile } from '../utils/uploader.js';

// @desc    Register a new user (Patient or Doctor)
// @route   POST /api/auth/register
// @access  Public
export const register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    // Generate email verification token
    const verificationToken = crypto.randomBytes(20).toString('hex');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      role,
      verificationToken,
    });

    if (role === 'patient') {
      // Create patient profile
      await PatientProfile.create({ userId: user._id });
    } else if (role === 'doctor') {
      // Gather additional doctor details
      const { specialization, location, experience, fees, bio, education } = req.body;

      // Handle certificates upload if files exist
      let certificateUrls = [];
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const url = await uploadFile(file);
          if (url) certificateUrls.push(url);
        }
      }

      // Create doctor profile with status pending
      await DoctorProfile.create({
        userId: user._id,
        specialization: specialization || 'General Physician',
        location: location || 'Not Specified',
        experience: experience ? parseInt(experience) : 0,
        fees: fees ? parseFloat(fees) : 0,
        bio: bio || 'No biography provided yet.',
        education: education || 'Not Specified',
        certificates: certificateUrls,
        status: 'pending',
      });
    }

    // Send verification email
    const verificationUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/verify-email?token=${verificationToken}`;
    const htmlMessage = `
      <h1>Verify your MediConnect Email</h1>
      <p>Thank you for registering. Please click the link below to verify your email address:</p>
      <a href="${verificationUrl}" target="_blank" style="padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Verify Email</a>
      <p>If you did not request this, please ignore this email.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'MediConnect Email Verification',
        html: htmlMessage,
        message: `Please verify your email using this link: ${verificationUrl}`,
      });
    } catch (emailError) {
      console.error('Email sending failed during registration:', emailError);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      userId: user._id,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Authenticate user & get token (Login)
// @route   POST /api/auth/login
// @access  Public
export const login = async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Validate email & password
    if (!email || !password || !role) {
      return res.status(400).json({ success: false, message: 'Please provide email, password, and role' });
    }

    // Check for user
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if role matches
    if (user.role !== role) {
      return res.status(401).json({ success: false, message: `Access denied. Incorrect role selection.` });
    }

    // Check if password matches
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    // Check if email is verified
    if (!user.isVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in. Check your inbox for the verification link.',
      });
    }

    // If doctor, check profile status
    if (role === 'doctor') {
      const doctorProfile = await DoctorProfile.findOne({ userId: user._id });
      if (doctorProfile && doctorProfile.status === 'pending') {
        return res.status(403).json({
          success: false,
          message: 'Your account is pending admin approval. You will receive an email once approved.',
        });
      }
      if (doctorProfile && doctorProfile.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your account is suspended. Please contact support.',
        });
      }
      if (doctorProfile && doctorProfile.status === 'rejected') {
        return res.status(403).json({
          success: false,
          message: 'Your application was rejected by the admin.',
        });
      }
    }

    // Generate JWT and set cookie
    const token = generateToken(res, user._id);

    // Fetch additional profile data
    let profile = null;
    if (role === 'patient') {
      profile = await PatientProfile.findOne({ userId: user._id });
    } else if (role === 'doctor') {
      profile = await DoctorProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isVerified: user.isVerified,
      },
      profile,
      token,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify email address
// @route   GET /api/auth/verify-email/:token
// @access  Public
export const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    const user = await User.findOne({ verificationToken: token });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get current logged in user details
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    let profile = null;

    if (user.role === 'patient') {
      profile = await PatientProfile.findOne({ userId: user._id }).populate('favouriteDoctors', 'name email');
    } else if (user.role === 'doctor') {
      profile = await DoctorProfile.findOne({ userId: user._id });
    }

    res.json({
      success: true,
      user,
      profile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Log user out / clear cookie
// @route   GET /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    res.cookie('token', '', {
      httpOnly: true,
      expires: new Date(0),
    });

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Forgot Password
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: 'There is no user with that email' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(20).toString('hex');

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save();

    // Create reset url
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}`;
    const htmlMessage = `
      <h1>Password Reset Request</h1>
      <p>You are receiving this email because you (or someone else) requested a password reset. Please click the link below to reset your password:</p>
      <a href="${resetUrl}" target="_blank" style="padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Reset Password</a>
      <p>This link is valid for 10 minutes. If you did not request this, please ignore this email.</p>
    `;

    try {
      await sendEmail({
        email: user.email,
        subject: 'MediConnect Password Reset',
        html: htmlMessage,
        message: `Please reset your password using this link: ${resetUrl}`,
      });

      res.json({ success: true, message: 'Reset link sent to your email.' });
    } catch (err) {
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      return res.status(500).json({ success: false, message: 'Email could not be sent' });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reset Password
// @route   PUT /api/auth/reset-password/:token
// @access  Public
export const resetPassword = async (req, res) => {
  try {
    // Get hashed token
    const resetPasswordToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset token' });
    }

    // Set new password
    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    res.json({
      success: true,
      message: 'Password reset successful! You can now log in with your new password.',
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
