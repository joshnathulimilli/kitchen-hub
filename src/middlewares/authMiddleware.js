const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');
const asyncHandler = require('./asyncHandler');

const protect = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication token is required');
  }

  const token = authHeader.split(' ')[1];
  let decoded;

  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new ApiError(401, 'Invalid or expired token');
  }

  const user = await User.findById(decoded.id).select('-password');

  if (!user || !user.isActive) {
    throw new ApiError(401, 'User is not authorized');
  }

  req.user = user;
  next();
});

const authorize = (...roles) => {
  let message = 'You do not have permission to perform this action';
  if (roles.length > 0 && typeof roles[roles.length - 1] === 'string' && roles[roles.length - 1].includes(' ')) {
    message = roles.pop();
  }

  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, message));
    }

    next();
  };
};

module.exports = {
  protect,
  authorize
};
