import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Appointment from '../models/Appointment.js';
import PatientProfile from '../models/PatientProfile.js';
import Notification from '../models/Notification.js';
import sendEmail from '../utils/sendEmail.js';
import { generatePrescriptionPDF } from '../utils/pdfGenerator.js';
import { uploadFile } from '../utils/uploader.js';

// Helper to send socket notifications in real-time
const sendLiveNotification = (req, userId, title, message, type) => {
  if (req.io && req.userSockets) {
    const socketId = req.userSockets.get(userId.toString());
    if (socketId) {
      req.io.to(socketId).emit('new_notification', {
        title,
        message,
        type: type || 'general',
        createdAt: new Date(),
      });
    }
  }
};

// @desc    Get doctor profile
// @route   GET /api/doctor/profile
// @access  Private (Doctor only)
export const getDoctorProfileSelf = async (req, res) => {
  try {
    const profile = await DoctorProfile.findOne({ userId: req.user._id }).populate('userId', 'name email role');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update doctor profile
// @route   PUT /api/doctor/profile
// @access  Private (Doctor only)
export const updateDoctorProfile = async (req, res) => {
  try {
    const { name, specialization, location, experience, fees, bio, education } = req.body;

    // Update User model fields
    if (name) {
      await User.findByIdAndUpdate(req.user._id, { name });
    }

    // Prepare profile updates
    const profileUpdates = {};
    if (specialization) profileUpdates.specialization = specialization;
    if (location) profileUpdates.location = location;
    if (experience) profileUpdates.experience = parseInt(experience);
    if (fees) profileUpdates.fees = parseFloat(fees);
    if (bio) profileUpdates.bio = bio;
    if (education) profileUpdates.education = education;

    // Handle Certificate Uploads
    if (req.files && req.files.length > 0) {
      const currentProfile = await DoctorProfile.findOne({ userId: req.user._id });
      let currentCertificates = currentProfile.certificates || [];
      for (const file of req.files) {
        const url = await uploadFile(file);
        if (url) currentCertificates.push(url);
      }
      profileUpdates.certificates = currentCertificates;
    }

    const updatedProfile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: profileUpdates },
      { new: true, runValidators: true }
    ).populate('userId', 'name email role');

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: updatedProfile,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update availability slots
// @route   PUT /api/doctor/availability
// @access  Private (Doctor only)
export const updateAvailability = async (req, res) => {
  try {
    const { availabilitySlots } = req.body; // Array of { day: 'Monday', slots: ['09:00 AM', ...] }

    if (!availabilitySlots || !Array.isArray(availabilitySlots)) {
      return res.status(400).json({ success: false, message: 'Please provide valid availability slots' });
    }

    const profile = await DoctorProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: { availabilitySlots: availabilitySlots } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Availability slots updated successfully',
      data: profile.availabilitySlots,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get doctor dashboard analytics
// @route   GET /api/doctor/analytics
// @access  Private (Doctor only)
export const getDoctorAnalytics = async (req, res) => {
  try {
    const doctorId = req.user._id;

    // Total Completed & Paid Appointments
    const totalAppointments = await Appointment.countDocuments({ doctorId });
    const completedAppointmentsCount = await Appointment.countDocuments({ doctorId, status: 'completed' });
    const pendingAppointmentsCount = await Appointment.countDocuments({ doctorId, status: 'pending' });

    // Total Revenue (Paid and Completed)
    const paidAppointments = await Appointment.find({ doctorId, paymentStatus: 'paid' });
    const totalRevenue = paidAppointments.reduce((sum, app) => sum + app.amount, 0);

    // Unique Patients
    const uniquePatientsResult = await Appointment.distinct('patientId', { doctorId });
    const uniquePatientsCount = uniquePatientsResult.length;

    // Patient Retention Rate (repeat vs unique patients)
    const appointmentsByPatient = await Appointment.aggregate([
      { $match: { doctorId } },
      { $group: { _id: '$patientId', count: { $sum: 1 } } }
    ]);
    const repeatPatients = appointmentsByPatient.filter(p => p.count > 1).length;
    const patientRetentionRate = uniquePatientsCount > 0 
      ? Math.round((repeatPatients / uniquePatientsCount) * 100) 
      : 0;

    // Popular Booking Slots
    const popularSlots = await Appointment.aggregate([
      { $match: { doctorId } },
      { $group: { _id: '$timeSlot', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    // Revenue by Month for Chart
    const monthlyRevenue = await Appointment.aggregate([
      { $match: { doctorId, paymentStatus: 'paid' } },
      {
        $group: {
          _id: { $substr: ['$date', 0, 7] }, // YYYY-MM
          revenue: { $sum: '$amount' },
          appointments: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // Today's appointments list
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysAppointments = await Appointment.find({ doctorId, date: todayStr })
      .populate('patientId', 'name email')
      .sort({ timeSlot: 1 });

    // All appointments list
    const allAppointments = await Appointment.find({ doctorId })
      .populate('patientId', 'name email')
      .sort({ date: -1, timeSlot: 1 });

    res.json({
      success: true,
      analytics: {
        totalAppointments,
        completedAppointmentsCount,
        pendingAppointmentsCount,
        totalRevenue,
        uniquePatientsCount,
        patientRetentionRate,
        popularSlots,
        monthlyRevenue,
        todaysAppointments,
        allAppointments,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Write prescription & complete appointment
// @route   POST /api/doctor/appointments/:appointmentId/prescription
// @access  Private (Doctor only)
export const writePrescription = async (req, res) => {
  try {
    const { text, medicines } = req.body;
    const { appointmentId } = req.params;

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.doctorId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You are not authorized to write a prescription for this appointment' });
    }

    // Populate user references for PDF generator
    const patientUser = await User.findById(appointment.patientId);
    const doctorUser = await User.findById(appointment.doctorId);
    const doctorProfile = await DoctorProfile.findOne({ userId: appointment.doctorId });

    // Update prescription details
    appointment.prescription = {
      text,
      medicines: medicines || [],
    };
    appointment.status = 'completed';

    // Generate prescription PDF
    const pdfUrl = await generatePrescriptionPDF(appointment, patientUser, doctorUser, doctorProfile);
    appointment.prescription.pdfUrl = pdfUrl;

    await appointment.save();

    // Create Notification for Patient
    await Notification.create({
      userId: appointment.patientId,
      title: 'New Prescription Uploaded',
      message: `Dr. ${doctorUser.name} has uploaded a new prescription for your consultation on ${appointment.date}.`,
      type: 'appointment',
    });

    sendLiveNotification(
      req,
      appointment.patientId,
      'New Prescription Uploaded',
      `Dr. ${doctorUser.name} has uploaded a new prescription for your consultation on ${appointment.date}.`,
      'appointment'
    );

    // Send Email to Patient
    const htmlMessage = `
      <h1>Your Prescription is Ready</h1>
      <p>Dear ${patientUser.name},</p>
      <p>Dr. ${doctorUser.name} has completed your consultation and written a prescription.</p>
      <p>You can download it from your MediConnect dashboard or directly via the link below:</p>
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}${pdfUrl}" target="_blank" style="padding: 10px 20px; background-color: #14B8A6; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Download Prescription</a>
    `;

    try {
      await sendEmail({
        email: patientUser.email,
        subject: 'Prescription Available - MediConnect',
        html: htmlMessage,
        message: `Your prescription is ready. Download here: ${process.env.CLIENT_URL || 'http://localhost:5173'}${pdfUrl}`,
      });
    } catch (err) {
      console.error('Failed to send prescription notification email:', err);
    }

    res.json({
      success: true,
      message: 'Prescription generated and consultation completed',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
