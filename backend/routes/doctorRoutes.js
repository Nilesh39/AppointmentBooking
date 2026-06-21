import express from 'express';
import {
  getDoctorProfileSelf,
  updateDoctorProfile,
  updateAvailability,
  getDoctorAnalytics,
  writePrescription,
} from '../controllers/doctorController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Protected doctor-only actions
router.use(protect, authorize('doctor'));

router.get('/profile', getDoctorProfileSelf);
router.put('/profile', upload.array('certificates', 5), updateDoctorProfile);
router.put('/availability', updateAvailability);
router.get('/analytics', getDoctorAnalytics);
router.post('/appointments/:appointmentId/prescription', writePrescription);

export default router;
