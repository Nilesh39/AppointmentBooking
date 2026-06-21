import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - verify token
export const protect = async (req, res, next) => {
  let token;

  // 1. Read token from cookie
  if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  // 2. Read token from Authorization header
  else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource',
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'supersecretjwtsecretkey_mediconnect_12345');

    // Attach user to request
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this id',
      });
    }

    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this resource, token failed',
    });
  }
};

// Grant access to specific roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role '${req.user?.role || 'unauthorized'}' is not authorized to access this route`,
      });
    }
    next();
  };
};
