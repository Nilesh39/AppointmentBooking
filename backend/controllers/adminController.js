import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import MedicineOrder from '../models/MedicineOrder.js';
import sendEmail from '../utils/sendEmail.js';

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

// @desc    Get admin statistics
// @route   GET /api/admin/analytics
// @access  Private (Admin only)
export const getAdminAnalytics = async (req, res) => {
  try {
    const totalDoctors = await DoctorProfile.countDocuments();
    const approvedDoctors = await DoctorProfile.countDocuments({ status: 'approved' });
    const pendingDoctors = await DoctorProfile.countDocuments({ status: 'pending' });
    const totalPatients = await PatientProfile.countDocuments();

    // Total revenue (from paid appointments)
    const paidAppointments = await Appointment.find({ paymentStatus: 'paid' });
    const totalRevenue = paidAppointments.reduce((sum, app) => sum + app.amount, 0);

    // Today's appointments
    const todayStr = new Date().toISOString().split('T')[0];
    const todaysAppointmentsCount = await Appointment.countDocuments({ date: todayStr });

    // Recent activities (mock logs combined with database queries)
    const recentAppointments = await Appointment.find()
      .populate('patientId', 'name')
      .populate('doctorId', 'name')
      .sort({ createdAt: -1 })
      .limit(5);

    const activityLogs = recentAppointments.map(app => ({
      timestamp: app.createdAt,
      message: `Appointment of $${app.amount} created for Patient "${app.patientId?.name || 'Unknown'}" with Dr. "${app.doctorId?.name || 'Unknown'}" - Status: ${app.status}`,
    }));

    res.json({
      success: true,
      data: {
        totalDoctors,
        approvedDoctors,
        pendingDoctors,
        totalPatients,
        totalRevenue,
        todaysAppointmentsCount,
        activityLogs,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all doctors (optionally filtered by status)
// @route   GET /api/admin/doctors
// @access  Private (Admin only)
export const getDoctors = async (req, res) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status) {
      filter.status = status;
    }

    const doctors = await DoctorProfile.find(filter).populate('userId', 'name email role');
    res.json({ success: true, data: doctors });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Approve doctor application
// @route   PUT /api/admin/doctors/:id/approve
// @access  Private (Admin only)
export const approveDoctor = async (req, res) => {
  try {
    const doctorUserId = req.params.id;

    const doctorProfile = await DoctorProfile.findOneAndUpdate(
      { userId: doctorUserId },
      { status: 'approved' },
      { new: true }
    );

    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Set isVerified = true in User account
    await User.findByIdAndUpdate(doctorUserId, { isVerified: true });

    const doctorUser = await User.findById(doctorUserId);

    // Create system notification
    await Notification.create({
      userId: doctorUserId,
      title: 'Profile Approved',
      message: 'Congratulations! Your professional registration has been approved. You can now configure your schedule.',
      type: 'general',
    });

    sendLiveNotification(
      req,
      doctorUserId,
      'Profile Approved',
      'Congratulations! Your professional registration has been approved. You can now configure your schedule.',
      'general'
    );

    // Send Approval Email
    const htmlMessage = `
      <h1>Application Approved!</h1>
      <p>Dear Dr. ${doctorUser.name},</p>
      <p>Congratulations! Your professional registration with MediConnect has been approved.</p>
      <p>You can now log in, configure your availability time slots, and start receiving bookings from patients.</p>
      <a href="${process.env.CLIENT_URL || 'http://localhost:5173'}/login" target="_blank" style="padding: 10px 20px; background-color: #2563EB; color: white; text-decoration: none; border-radius: 5px; display: inline-block;">Log In to Portal</a>
    `;

    try {
      await sendEmail({
        email: doctorUser.email,
        subject: 'MediConnect Professional Profile Approved',
        html: htmlMessage,
        message: `Your application has been approved. Log in here: ${process.env.CLIENT_URL || 'http://localhost:5173'}/login`,
      });
    } catch (err) {
      console.error('Approval notification email failed:', err);
    }

    res.json({ success: true, message: 'Doctor approved successfully', data: doctorProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Reject doctor application
// @route   PUT /api/admin/doctors/:id/reject
// @access  Private (Admin only)
export const rejectDoctor = async (req, res) => {
  try {
    const doctorUserId = req.params.id;

    const doctorProfile = await DoctorProfile.findOneAndUpdate(
      { userId: doctorUserId },
      { status: 'rejected' },
      { new: true }
    );

    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const doctorUser = await User.findById(doctorUserId);

    // Create system notification
    await Notification.create({
      userId: doctorUserId,
      title: 'Application Rejected',
      message: 'Your registration application was rejected. Please check your email for details.',
      type: 'general',
    });

    sendLiveNotification(
      req,
      doctorUserId,
      'Application Rejected',
      'Your registration application was rejected. Please check your email for details.',
      'general'
    );

    // Send Rejection Email
    const htmlMessage = `
      <h1>Application Update</h1>
      <p>Dear Dr. ${doctorUser.name},</p>
      <p>Thank you for your interest in joining MediConnect. Unfortunately, after reviewing your credentials, we are unable to approve your profile at this time.</p>
      <p>If you believe this was an error or wish to submit additional details, please reply to this email.</p>
    `;

    try {
      await sendEmail({
        email: doctorUser.email,
        subject: 'MediConnect Profile Application Status',
        html: htmlMessage,
        message: 'Your profile application has been rejected.',
      });
    } catch (err) {
      console.error('Rejection notification email failed:', err);
    }

    res.json({ success: true, message: 'Doctor application rejected', data: doctorProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Suspend doctor status
// @route   PUT /api/admin/doctors/:id/suspend
// @access  Private (Admin only)
export const suspendDoctor = async (req, res) => {
  try {
    const doctorUserId = req.params.id;

    const doctorProfile = await DoctorProfile.findOneAndUpdate(
      { userId: doctorUserId },
      { status: 'suspended' },
      { new: true }
    );

    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    const doctorUser = await User.findById(doctorUserId);

    // Create system notification
    await Notification.create({
      userId: doctorUserId,
      title: 'Profile Suspended',
      message: 'Your professional account has been suspended by the administrator. Contact support for assistance.',
      type: 'general',
    });

    sendLiveNotification(
      req,
      doctorUserId,
      'Profile Suspended',
      'Your professional account has been suspended by the administrator. Contact support for assistance.',
      'general'
    );

    // Send Rejection Email
    const htmlMessage = `
      <h1>Profile Suspended</h1>
      <p>Dear Dr. ${doctorUser.name},</p>
      <p>We regret to inform you that your MediConnect account has been suspended by the administrator.</p>
      <p>If you wish to dispute this, please contact support.</p>
    `;

    try {
      await sendEmail({
        email: doctorUser.email,
        subject: 'MediConnect Account Suspended',
        html: htmlMessage,
        message: 'Your account has been suspended.',
      });
    } catch (err) {
      console.error('Suspension notification email failed:', err);
    }

    res.json({ success: true, message: 'Doctor suspended successfully', data: doctorProfile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a doctor
// @route   DELETE /api/admin/doctors/:id
// @access  Private (Admin only)
export const deleteDoctor = async (req, res) => {
  try {
    const doctorUserId = req.params.id;

    await DoctorProfile.findOneAndDelete({ userId: doctorUserId });
    await User.findByIdAndDelete(doctorUserId);

    res.json({ success: true, message: 'Doctor deleted from system' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all patients
// @route   GET /api/admin/patients
// @access  Private (Admin only)
export const getPatients = async (req, res) => {
  try {
    const patients = await PatientProfile.find().populate('userId', 'name email role');
    res.json({ success: true, data: patients });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a patient
// @route   DELETE /api/admin/patients/:id
// @access  Private (Admin only)
export const deletePatient = async (req, res) => {
  try {
    const patientUserId = req.params.id;

    await PatientProfile.findOneAndDelete({ userId: patientUserId });
    await User.findByIdAndDelete(patientUserId);

    res.json({ success: true, message: 'Patient deleted from system' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all reviews
// @route   GET /api/admin/reviews
// @access  Private (Admin only)
export const getReviews = async (req, res) => {
  try {
    const reviews = await Review.find()
      .populate('patientId', 'name email')
      .populate('doctorId', 'name email');
    res.json({ success: true, data: reviews });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete a review
// @route   DELETE /api/admin/reviews/:id
// @access  Private (Admin only)
export const deleteReview = async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    await review.deleteOne(); // Triggers getAverageRating recalculation hook
    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Export payments report as CSV
// @route   GET /api/admin/reports/export
// @access  Private (Admin only)
export const exportReportsCSV = async (req, res) => {
  try {
    const appointments = await Appointment.find({ paymentStatus: 'paid' })
      .populate('patientId', 'name email')
      .populate('doctorId', 'name');

    // Create CSV headers
    let csv = 'Appointment ID,Patient Name,Patient Email,Doctor Name,Date,Amount,Payment Status,Created At\n';

    // Populate lines
    appointments.forEach((app) => {
      csv += `"${app._id}","${app.patientId?.name || 'N/A'}","${app.patientId?.email || 'N/A'}","Dr. ${app.doctorId?.name || 'N/A'}","${app.date}","${app.amount}","${app.paymentStatus}","${app.createdAt.toISOString()}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.attachment('payment-report.csv');
    res.send(csv);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Send global notification
// @route   POST /api/admin/notifications
// @access  Private (Admin only)
export const sendSystemNotification = async (req, res) => {
  try {
    const { title, message, roleTarget } = req.body; // roleTarget: 'patient' | 'doctor' | 'all'

    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Please provide title and message' });
    }

    let filter = {};
    if (roleTarget && roleTarget !== 'all') {
      filter.role = roleTarget;
    }

    const users = await User.find(filter);

    const notifications = users.map(user => ({
      userId: user._id,
      title,
      message,
      type: 'general',
    }));

    await Notification.insertMany(notifications);

    // Send real-time socket notifications to active users
    users.forEach(user => {
      sendLiveNotification(req, user._id, title, message, 'general');
    });

    res.json({ success: true, message: `System notification sent to ${users.length} users.` });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all medicine orders on the platform
// @route   GET /api/admin/orders
// @access  Private (Admin only)
export const getMedicineOrdersAdmin = async (req, res) => {
  try {
    const orders = await MedicineOrder.find({})
      .populate('patientId', 'name email')
      .populate({
        path: 'appointmentId',
        populate: {
          path: 'doctorId',
          select: 'name email',
        },
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update order shipping status
// @route   PUT /api/admin/orders/:orderId/shipping
// @access  Private (Admin only)
export const updateShippingStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { 
      shippingStatus, 
      estimatedDeliveryDate, 
      deliveryPartnerName, 
      deliveryPartnerPhone, 
      trackingNumber,
      activity,
      location 
    } = req.body;

    const order = await MedicineOrder.findById(orderId);
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (shippingStatus) {
      if (!['processing', 'shipped', 'out_for_delivery', 'delivered'].includes(shippingStatus)) {
        return res.status(400).json({ success: false, message: 'Invalid shipping status' });
      }
      order.shippingStatus = shippingStatus;
    }

    if (estimatedDeliveryDate !== undefined) {
      order.estimatedDeliveryDate = estimatedDeliveryDate;
    }
    if (deliveryPartnerName !== undefined) {
      order.deliveryPartnerName = deliveryPartnerName;
    }
    if (deliveryPartnerPhone !== undefined) {
      order.deliveryPartnerPhone = deliveryPartnerPhone;
    }
    if (trackingNumber !== undefined) {
      order.trackingNumber = trackingNumber;
    }

    // Add tracking milestone update
    if (activity) {
      order.trackingUpdates.push({
        status: shippingStatus || order.shippingStatus,
        activity,
        location: location || 'Shipping Hub',
        timestamp: new Date()
      });
    } else if (shippingStatus) {
      const defaults = {
        processing: 'Medications are being checked and packaged.',
        shipped: 'Order dispatched from central pharmacy and handed over to courier.',
        out_for_delivery: 'Package is out for delivery with courier partner.',
        delivered: 'Medications have been delivered successfully.'
      };
      order.trackingUpdates.push({
        status: shippingStatus,
        activity: defaults[shippingStatus],
        location: location || (shippingStatus === 'delivered' ? 'Patient Address' : 'Shipping Hub'),
        timestamp: new Date()
      });
    }

    await order.save();

    const title = 'Pharmacy Order Update';
    const statusText = (shippingStatus || order.shippingStatus).toUpperCase().replace(/_/g, ' ');
    const message = `Your medicine order status has been updated to: ${statusText}.`;
    
    await Notification.create({
      userId: order.patientId,
      title,
      message,
      type: 'general',
    });

    sendLiveNotification(req, order.patientId, title, message, 'general');

    res.json({ success: true, message: 'Shipping status and tracking updated successfully', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
