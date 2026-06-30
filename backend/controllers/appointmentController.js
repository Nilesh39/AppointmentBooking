import Stripe from 'stripe';
import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import Notification from '../models/Notification.js';
import Review from '../models/Review.js';
import sendEmail from '../utils/sendEmail.js';
import { generateInvoicePDF } from '../utils/pdfGenerator.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// Helper to translate weekday numbers to day names in a timezone-safe manner
const getDayName = (dateStr) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dateObj.getDay()];
  }
  const dateObj = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[dateObj.getDay()];
};

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

// @desc    Book an appointment
// @route   POST /api/appointments/book
// @access  Private (Patient only)
export const bookAppointment = async (req, res) => {
  try {
    const { doctorId, date, timeSlot } = req.body;
    const patientId = req.user._id;

    if (!doctorId || !date || !timeSlot) {
      return res.status(400).json({ success: false, message: 'Please provide doctorId, date, and timeSlot' });
    }

    // 1. Check if doctor exists and has approved profile
    const doctorUser = await User.findOne({ _id: doctorId, role: 'doctor' });
    const doctorProfile = await DoctorProfile.findOne({ userId: doctorId });

    if (!doctorUser || !doctorProfile || doctorProfile.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Doctor is not available for booking' });
    }

    // 2. Validate doctor availability on this weekday
    const weekday = getDayName(date);
    const daySchedule = doctorProfile.availabilitySlots.find(s => s.day === weekday);

    if (!daySchedule || !daySchedule.slots.includes(timeSlot)) {
      return res.status(400).json({ success: false, message: `Doctor does not consult on ${weekday} at ${timeSlot}` });
    }

    // 3. Prevent double booking for same doctor on same date and time (fail-safe check before insert)
    const bookingConflict = await Appointment.findOne({
      doctorId,
      date,
      timeSlot,
      status: { $in: ['pending', 'accepted', 'completed'] },
    });

    if (bookingConflict) {
      return res.status(400).json({ success: false, message: 'This slot is already booked' });
    }

    // 4. Create appointment
    const amount = doctorProfile.fees;
    const appointment = await Appointment.create({
      patientId,
      doctorId,
      date,
      timeSlot,
      amount,
      paymentStatus: 'unpaid',
      status: 'pending',
    });

    res.status(201).json({
      success: true,
      message: 'Slot reserved! Proceed to payment.',
      appointment,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: 'This slot is already booked' });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Stripe Checkout Session
// @route   POST /api/appointments/:appointmentId/checkout
// @access  Private (Patient only)
export const checkoutSession = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const appointment = await Appointment.findById(appointmentId).populate('doctorId', 'name');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    // Stripe checkout integration
    if (stripe) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: `Consultation with Dr. ${appointment.doctorId?.name}`,
                description: `Scheduled for ${appointment.date} at ${appointment.timeSlot}`,
              },
              unit_amount: appointment.amount * 100, // Stripe expects cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?appointment_id=${appointment._id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/appointments`,
        metadata: {
          appointmentId: appointment._id.toString(),
        },
      });

      appointment.stripeSessionId = session.id;
      await appointment.save();

      return res.json({ success: true, url: session.url });
    } else {
      // Mock payment fallback redirection url pointing to custom frontend checkout page
      const mockCheckoutUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/checkout/${appointment._id}`;
      return res.json({ success: true, url: mockCheckoutUrl, isMock: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify appointment payment status
// @route   POST /api/appointments/verify
// @access  Private (Patient/Doctor/Admin)
export const verifyPayment = async (req, res) => {
  try {
    const { appointmentId, sessionId, isMock } = req.body;
    const appointment = await Appointment.findById(appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.paymentStatus === 'paid') {
      return res.json({ success: true, message: 'Appointment is already paid', data: appointment });
    }

    // Verify Stripe checkout
    if (stripe && sessionId && !isMock) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ success: false, message: 'Payment has not been completed' });
      }
    }

    // Complete transaction
    appointment.paymentStatus = 'paid';
    appointment.status = 'accepted'; // Auto-approve on successful payment

    // Get profiles for Invoice PDF
    const patientUser = await User.findById(appointment.patientId);
    const doctorUser = await User.findById(appointment.doctorId);
    const doctorProfile = await DoctorProfile.findOne({ userId: appointment.doctorId });

    const invoiceUrl = await generateInvoicePDF(appointment, patientUser, doctorUser, doctorProfile);
    appointment.invoiceUrl = invoiceUrl;

    await appointment.save();

    // Create system notification for patient and doctor
    await Notification.create({
      userId: appointment.patientId,
      title: 'Appointment Booked & Confirmed',
      message: `Your appointment with Dr. ${doctorUser.name} on ${appointment.date} at ${appointment.timeSlot} is confirmed. Invoice is ready.`,
      type: 'payment',
    });

    sendLiveNotification(
      req,
      appointment.patientId,
      'Appointment Booked & Confirmed',
      `Your appointment with Dr. ${doctorUser.name} on ${appointment.date} at ${appointment.timeSlot} is confirmed.`,
      'payment'
    );

    await Notification.create({
      userId: appointment.doctorId,
      title: 'New Appointment Booked',
      message: `Patient ${patientUser.name} has booked a slot on ${appointment.date} at ${appointment.timeSlot}.`,
      type: 'appointment',
    });

    sendLiveNotification(
      req,
      appointment.doctorId,
      'New Appointment Booked',
      `Patient ${patientUser.name} has booked a slot on ${appointment.date} at ${appointment.timeSlot}.`,
      'appointment'
    );

    // Send Booking Confirmation Emails
    const emailHtmlPatient = `
      <h1>Appointment Confirmed</h1>
      <p>Dear ${patientUser.name},</p>
      <p>Your booking with Dr. ${doctorUser.name} is confirmed!</p>
      <p><strong>Date:</strong> ${appointment.date}</p>
      <p><strong>Time Slot:</strong> ${appointment.timeSlot}</p>
      <p>You can download the invoice PDF from your dashboard at: ${process.env.CLIENT_URL || 'http://localhost:5173'}${invoiceUrl}</p>
    `;

    try {
      await sendEmail({
        email: patientUser.email,
        subject: 'Appointment Confirmation - MediConnect',
        html: emailHtmlPatient,
        message: `Your appointment is confirmed on ${appointment.date} at ${appointment.timeSlot}`,
      });
    } catch (err) {
      console.error('Nodemailer email failure:', err);
    }

    res.json({
      success: true,
      message: 'Payment completed and booking confirmed!',
      data: appointment,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:appointmentId/cancel
// @access  Private
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    // Verify user ownership (patient or doctor)
    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Not authorized to cancel this appointment' });
    }

    let refundMessage = '';
    const wasPaid = appointment.paymentStatus === 'paid';
    if (wasPaid) {
      appointment.paymentStatus = 'refunded';
      refundMessage = ` A refund of $${appointment.amount} has been initiated.`;
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Notify other party
    const notifier = req.user.name;
    const recipientId = isPatient ? appointment.doctorId : appointment.patientId;

    await Notification.create({
      userId: recipientId,
      title: 'Appointment Cancelled',
      message: `The appointment scheduled for ${appointment.date} at ${appointment.timeSlot} has been cancelled by ${notifier}.${refundMessage}`,
      type: 'appointment',
    });

    sendLiveNotification(
      req,
      recipientId,
      'Appointment Cancelled',
      `The appointment scheduled for ${appointment.date} at ${appointment.timeSlot} has been cancelled by ${notifier}.${refundMessage}`,
      'appointment'
    );

    // If a refund was initiated, notify the patient directly as well
    if (wasPaid) {
      await Notification.create({
        userId: appointment.patientId,
        title: 'Refund Initiated',
        message: `Your refund of $${appointment.amount} for the cancelled appointment on ${appointment.date} at ${appointment.timeSlot} has been initiated successfully.`,
        type: 'payment',
      });

      sendLiveNotification(
        req,
        appointment.patientId,
        'Refund Initiated',
        `Your refund of $${appointment.amount} for the cancelled appointment on ${appointment.date} has been initiated successfully.`,
        'payment'
      );
    }

    res.json({ success: true, message: `Appointment cancelled successfully.${refundMessage}`, data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Request appointment reschedule
// @route   PUT /api/appointments/:appointmentId/reschedule-request
// @access  Private
export const requestReschedule = async (req, res) => {
  try {
    const { newDate, newTimeSlot, reason } = req.body;
    const appointment = await Appointment.findById(req.params.appointmentId);

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();

    if (!isPatient && !isDoctor) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    appointment.rescheduleRequest = {
      requestedBy: isPatient ? 'patient' : 'doctor',
      newDate,
      newTimeSlot,
      reason: reason || 'No reason provided',
    };

    await appointment.save();

    const recipientId = isPatient ? appointment.doctorId : appointment.patientId;
    await Notification.create({
      userId: recipientId,
      title: 'Reschedule Request Received',
      message: `${req.user.name} has requested to reschedule your appointment to ${newDate} at ${newTimeSlot}.`,
      type: 'appointment',
    });

    sendLiveNotification(
      req,
      recipientId,
      'Reschedule Request Received',
      `${req.user.name} has requested to reschedule your appointment to ${newDate} at ${newTimeSlot}.`,
      'appointment'
    );

    res.json({ success: true, message: 'Reschedule request submitted successfully', data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Accept/Approve reschedule request
// @route   PUT /api/appointments/:appointmentId/reschedule-accept
// @access  Private
export const acceptReschedule = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (!appointment.rescheduleRequest || !appointment.rescheduleRequest.requestedBy) {
      return res.status(400).json({ success: false, message: 'No active reschedule request found' });
    }

    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();

    // The acceptor MUST be the opposite of the requester
    const requestSource = appointment.rescheduleRequest.requestedBy;
    if ((requestSource === 'patient' && !isDoctor) || (requestSource === 'doctor' && !isPatient)) {
      return res.status(403).json({ success: false, message: 'You cannot accept your own reschedule request' });
    }

    // Apply rescheduled time
    appointment.date = appointment.rescheduleRequest.newDate;
    appointment.timeSlot = appointment.rescheduleRequest.newTimeSlot;
    appointment.rescheduleRequest = { requestedBy: '', newDate: '', newTimeSlot: '', reason: '' };
    appointment.status = 'accepted'; // Reset status to accepted if it was pending/rescheduled

    await appointment.save();

    const recipientId = isPatient ? appointment.doctorId : appointment.patientId;
    await Notification.create({
      userId: recipientId,
      title: 'Reschedule Request Accepted',
      message: `Your reschedule request to ${appointment.date} at ${appointment.timeSlot} has been accepted.`,
      type: 'appointment',
    });

    sendLiveNotification(
      req,
      recipientId,
      'Reschedule Request Accepted',
      `Your reschedule request to ${appointment.date} at ${appointment.timeSlot} has been accepted.`,
      'appointment'
    );

    res.json({ success: true, message: 'Appointment rescheduled successfully', data: appointment });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get user appointment history
// @route   GET /api/appointments
// @access  Private
export const getAppointments = async (req, res) => {
  try {
    let query = {};
    if (req.user.role === 'patient') {
      query.patientId = req.user._id;
    } else if (req.user.role === 'doctor') {
      query.doctorId = req.user._id;
    }

    const appointments = await Appointment.find(query)
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email')
      .sort({ createdAt: -1 });

    // Populate specialization and location details for patients
    let finalAppointments = appointments;
    if (req.user.role === 'patient') {
      finalAppointments = await Promise.all(appointments.map(async (app) => {
        const docProfile = await DoctorProfile.findOne({ userId: app.doctorId }).select('specialization location');
        const appObj = app.toObject();
        appObj.doctorProfile = docProfile;
        return appObj;
      }));
    }

    res.json({ success: true, data: finalAppointments });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Download invoice PDF
// @route   GET /api/appointments/:appointmentId/invoice
// @access  Private
export const downloadInvoice = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const isPatient = appointment.patientId.toString() === req.user._id.toString();
    const isDoctor = appointment.doctorId.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPatient && !isDoctor && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Unauthorized download request' });
    }

    if (!appointment.invoiceUrl) {
      return res.status(404).json({ success: false, message: 'Invoice not generated yet' });
    }

    res.json({ success: true, url: appointment.invoiceUrl });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add review to completed appointment
// @route   POST /api/appointments/:appointmentId/review
// @access  Private (Patient only)
export const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const { appointmentId } = req.params;

    if (!rating || !comment) {
      return res.status(400).json({ success: false, message: 'Please provide rating and comment' });
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (appointment.status !== 'completed') {
      return res.status(400).json({ success: false, message: 'You can only review doctors after a completed appointment' });
    }

    // Check if patient already reviewed this doctor
    const existingReview = await Review.findOne({
      patientId: req.user._id,
      doctorId: appointment.doctorId,
    });

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this doctor' });
    }

    const review = await Review.create({
      patientId: req.user._id,
      doctorId: appointment.doctorId,
      rating: parseInt(rating),
      comment,
    });

    // Recalculate average rating & ratings count for the doctor's profile
    const allDoctorReviews = await Review.find({ doctorId: appointment.doctorId });
    const ratingsCount = allDoctorReviews.length;
    const averageRating = ratingsCount > 0 
      ? allDoctorReviews.reduce((sum, r) => sum + r.rating, 0) / ratingsCount 
      : 0;

    await DoctorProfile.findOneAndUpdate(
      { userId: appointment.doctorId },
      { averageRating: parseFloat(averageRating.toFixed(1)), ratingsCount }
    );

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully',
      data: review,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
