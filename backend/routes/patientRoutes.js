import express from 'express';
import {
  getPatientProfile,
  updatePatientProfile,
  uploadMedicalRecord,
  deleteMedicalRecord,
  addMedicineReminder,
  deleteMedicineReminder,
  toggleFavouriteDoctor,
  getDoctors,
  getDoctorProfile,
  checkoutMedicineOrder,
  verifyMedicineOrder,
  getMedicineOrders,
  getMedicineOrderById,
} from '../controllers/patientController.js';
import { protect, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/multer.js';

const router = express.Router();

// Public doctor searches
router.get('/doctors', getDoctors);
router.get('/doctors/:id', getDoctorProfile);

// Protected patient-only actions
router.use(protect, authorize('patient'));

router.get('/profile', getPatientProfile);
router.put('/profile', upload.single('profilePic'), updatePatientProfile);

router.post('/records', upload.single('recordFile'), uploadMedicalRecord);
router.delete('/records/:recordId', deleteMedicalRecord);

router.post('/reminders', addMedicineReminder);
router.delete('/reminders/:reminderId', deleteMedicineReminder);

router.post('/favourites/:doctorId', toggleFavouriteDoctor);

// Pharmacy/Medicine Orders
router.post('/orders/checkout/:appointmentId', checkoutMedicineOrder);
router.post('/orders/verify', verifyMedicineOrder);
router.get('/orders', getMedicineOrders);
router.get('/orders/:orderId', getMedicineOrderById);

export default router;
