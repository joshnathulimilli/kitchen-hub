const User = require('../models/User');
const ApiError = require('../utils/apiError');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../middlewares/asyncHandler');
const crypto = require('crypto');
const { sendEmail } = require('../services/emailService');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, phone, role, address } = req.body;
  const requestedRole = role || 'customer';
  const userCount = await User.countDocuments();

  if (requestedRole === 'admin' && userCount > 0) {
    throw new ApiError(403, 'Admin accounts cannot be created from public registration');
  }

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new ApiError(409, 'Email is already registered');
  }

  const user = await User.create({
    name,
    email,
    password,
    phone,
    role: requestedRole,
    address
  });

  res.status(201).json({
    success: true,
    token: generateToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.matchPassword(password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Account is disabled');
  }

  res.json({
    success: true,
    token: generateToken(user),
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role
    }
  });
});

const me = asyncHandler(async (req, res) => {
  res.json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      phone: req.user.phone,
      role: req.user.role
    }
  });
});

const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');

  const user = await User.findOne({ email });
  if (!user) {
    // don't reveal whether email exists
    return res.json({ success: true, message: 'If that email exists, a reset token was generated' });
  }

  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password/${resetToken}`;
  const emailBody = `Hello ${user.name},\n\n` +
    `You requested a password reset for your KitchenHub account. Click the link below to set a new password:\n\n` +
    `${resetUrl}\n\n` +
    `If you did not request this, please ignore this message. The link expires in 1 hour.`;

  const emailHtml = `
    <p>Hello ${user.name},</p>
    <p>You requested a password reset for your KitchenHub account. Click the link below to set a new password:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p>If you did not request this, please ignore this message. The link expires in 1 hour.</p>
  `;

  let emailResult = null;
  try {
    emailResult = await sendEmail({
      to: user.email,
      subject: 'KitchenHub Password Reset',
      text: emailBody,
      html: emailHtml
    });
  } catch (err) {
    console.error('Email send failed:', err.message || err);
  }

  const response = {
    success: true,
    message: 'Password reset token created. Check your email for the reset link.'
  };

  if (!emailResult) {
    response.message = 'Password reset email could not be sent. Use the reset URL from server logs or configure email settings.';
    response.resetUrl = resetUrl;
  }

  res.json(response);
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  if (!token) throw new ApiError(400, 'Reset token is required');
  if (!password) throw new ApiError(400, 'New password is required');

  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  const user = await User.findOne({ resetPasswordToken: hashedToken, resetPasswordExpires: { $gt: Date.now() } }).select('+password');

  if (!user) throw new ApiError(400, 'Token is invalid or has expired');

  user.password = password;
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;

  await user.save();

  res.json({ success: true, message: 'Password has been reset. You can now log in with the new password.' });
});

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword
};
