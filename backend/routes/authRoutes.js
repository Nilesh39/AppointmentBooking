import express from 'express';
import {
  register,
  login,
  verifyEmail,
  getMe,
  logout,
  forgotPassword,
  resetPassword,
} from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Register handles file uploads for doctor certificates
router.post('/register', upload.array('certificates', 5), register);
router.post('/login', login);
router.get('/verify-email/:token', verifyEmail);
router.get('/me', protect, getMe);
router.get('/logout', protect, logout);
router.post('/forgot-password', forgotPassword);
router.put('/reset-password/:token', resetPassword);

export default router;
