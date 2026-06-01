const User = require('../models/User');
const ApiError = require('../utils/apiError');
const generateToken = require('../utils/generateToken');
const asyncHandler = require('../middlewares/asyncHandler');

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

module.exports = {
  register,
  login,
  me
};
