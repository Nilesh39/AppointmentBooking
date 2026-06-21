import express from 'express';
import {
  bookAppointment,
  checkoutSession,
  verifyPayment,
  cancelAppointment,
  requestReschedule,
  acceptReschedule,
  getAppointments,
  downloadInvoice,
  addReview,
} from '../controllers/appointmentController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// General protected routes (accessible by patient, doctor, and admin)
router.use(protect);

router.get('/', getAppointments);
router.put('/:appointmentId/cancel', cancelAppointment);
router.put('/:appointmentId/reschedule-request', requestReschedule);
router.put('/:appointmentId/reschedule-accept', acceptReschedule);
router.get('/:appointmentId/invoice', downloadInvoice);
router.post('/verify', verifyPayment);

// Patient-only routes
router.post('/book', authorize('patient'), bookAppointment);
router.post('/:appointmentId/checkout', authorize('patient'), checkoutSession);
router.post('/:appointmentId/review', authorize('patient'), addReview);

export default router;
