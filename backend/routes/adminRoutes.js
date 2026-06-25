import express from 'express';
import {
  getAdminAnalytics,
  getDoctors,
  approveDoctor,
  rejectDoctor,
  suspendDoctor,
  deleteDoctor,
  getPatients,
  deletePatient,
  getReviews,
  deleteReview,
  exportReportsCSV,
  sendSystemNotification,
  getMedicineOrdersAdmin,
  updateShippingStatus,
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';

const router = express.Router();

// Protected admin-only routes
router.use(protect, authorize('admin'));

router.get('/analytics', getAdminAnalytics);
router.get('/doctors', getDoctors);

router.put('/doctors/:id/approve', approveDoctor);
router.put('/doctors/:id/reject', rejectDoctor);
router.put('/doctors/:id/suspend', suspendDoctor);
router.delete('/doctors/:id', deleteDoctor);

router.get('/patients', getPatients);
router.delete('/patients/:id', deletePatient);

router.get('/reviews', getReviews);
router.delete('/reviews/:id', deleteReview);

router.get('/reports/export', exportReportsCSV);
router.post('/notifications', sendSystemNotification);

// E-Pharmacy Orders Management
router.get('/orders', getMedicineOrdersAdmin);
router.put('/orders/:orderId/shipping', updateShippingStatus);

export default router;
