import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Review from '../models/Review.js';
import Appointment from '../models/Appointment.js';
import MedicineOrder from '../models/MedicineOrder.js';
import Stripe from 'stripe';
import { uploadFile, deleteFile } from '../utils/uploader.js';

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

// @desc    Get patient profile
// @route   GET /api/patient/profile
// @access  Private (Patient only)
export const getPatientProfile = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ userId: req.user._id }).populate('userId', 'name email role');
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }
    res.json({ success: true, data: profile });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Update patient profile
// @route   PUT /api/patient/profile
// @access  Private (Patient only)
export const updatePatientProfile = async (req, res) => {
  try {
    const { name, phone, gender, dob } = req.body;

    // Update User model fields
    if (name) {
      await User.findByIdAndUpdate(req.user._id, { name });
    }

    // Prepare profile updates
    const profileUpdates = { phone, gender, dob };

    // Handle Profile Image Upload
    if (req.file) {
      const url = await uploadFile(req.file);
      if (url) {
        profileUpdates.profilePic = url;
      }
    }

    const updatedProfile = await PatientProfile.findOneAndUpdate(
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

// @desc    Upload medical record
// @route   POST /api/patient/records
// @access  Private (Patient only)
export const uploadMedicalRecord = async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, message: 'Please provide a name for the record' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const url = await uploadFile(req.file);
    if (!url) {
      return res.status(500).json({ success: false, message: 'File upload failed' });
    }

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $push: { medicalRecords: { name, url } } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Medical record uploaded successfully',
      data: profile.medicalRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteMedicalRecord = async (req, res) => {
  try {
    const profile = await PatientProfile.findOne({ userId: req.user._id });
    if (!profile) {
      return res.status(404).json({ success: false, message: 'Patient profile not found' });
    }

    const record = profile.medicalRecords.find((r) => r._id.toString() === req.params.recordId);
    if (record) {
      await deleteFile(record.url);
    }

    profile.medicalRecords = profile.medicalRecords.filter((r) => r._id.toString() !== req.params.recordId);
    await profile.save();

    res.json({
      success: true,
      message: 'Medical record deleted successfully',
      data: profile.medicalRecords,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Add medicine reminder
// @route   POST /api/patient/reminders
// @access  Private (Patient only)
export const addMedicineReminder = async (req, res) => {
  try {
    const { medicineName, dosage, time, days } = req.body;

    if (!medicineName || !dosage || !time || !days) {
      return res.status(400).json({ success: false, message: 'Please provide medicineName, dosage, time, and days' });
    }

    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $push: { medicineReminders: { medicineName, dosage, time, days } } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Medicine reminder added successfully',
      data: profile.medicineReminders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Delete medicine reminder
// @route   DELETE /api/patient/reminders/:reminderId
// @access  Private (Patient only)
export const deleteMedicineReminder = async (req, res) => {
  try {
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { medicineReminders: { _id: req.params.reminderId } } },
      { new: true }
    );

    res.json({
      success: true,
      message: 'Medicine reminder deleted successfully',
      data: profile.medicineReminders,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Toggle favourite doctor
// @route   POST /api/patient/favourites/:doctorId
// @access  Private (Patient only)
export const toggleFavouriteDoctor = async (req, res) => {
  try {
    const doctorId = req.params.doctorId;

    // Validate that the doctor actually exists
    const doctor = await User.findOne({ _id: doctorId, role: 'doctor' });
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const profile = await PatientProfile.findOne({ userId: req.user._id });
    const isFav = profile.favouriteDoctors.includes(doctorId);

    let updatedProfile;
    if (isFav) {
      updatedProfile = await PatientProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $pull: { favouriteDoctors: doctorId } },
        { new: true }
      );
      res.json({ success: true, message: 'Removed from favourites', data: updatedProfile.favouriteDoctors });
    } else {
      updatedProfile = await PatientProfile.findOneAndUpdate(
        { userId: req.user._id },
        { $push: { favouriteDoctors: doctorId } },
        { new: true }
      );
      res.json({ success: true, message: 'Added to favourites', data: updatedProfile.favouriteDoctors });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get all active/approved doctors with search filters (Debounced, Paginated)
// @route   GET /api/patient/doctors
// @access  Public
export const getDoctors = async (req, res) => {
  try {
    const { specialization, location, experience, maxFees, search, sortBy, page = 1, limit = 10 } = req.query;

    const query = { status: 'approved' };

    if (specialization) {
      query.specialization = specialization;
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (experience) {
      query.experience = { $gte: parseInt(experience) };
    }

    if (maxFees) {
      query.fees = { $lte: parseFloat(maxFees) };
    }

    // If search term matches doctor name
    let userFilter = { role: 'doctor' };
    if (search) {
      userFilter.name = { $regex: search, $options: 'i' };
      const matchedUsers = await User.find(userFilter).select('_id');
      const matchedUserIds = matchedUsers.map(u => u._id);
      query.userId = { $in: matchedUserIds };
    }

    let sortObj = { averageRating: -1, experience: -1 };
    if (sortBy === 'fees_asc') {
      sortObj = { fees: 1 };
    } else if (sortBy === 'fees_desc') {
      sortObj = { fees: -1 };
    } else if (sortBy === 'experience_desc') {
      sortObj = { experience: -1 };
    } else if (sortBy === 'rating_desc') {
      sortObj = { averageRating: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await DoctorProfile.find(query)
      .populate('userId', 'name email role')
      .skip(skip)
      .limit(parseInt(limit))
      .sort(sortObj);

    const total = await DoctorProfile.countDocuments(query);

    res.json({
      success: true,
      count: doctors.length,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      totalDoctors: total,
      data: doctors,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get detailed doctor profile by doctor user ID
// @route   GET /api/patient/doctors/:id
// @access  Public
export const getDoctorProfile = async (req, res) => {
  try {
    const doctorUserId = req.params.id;

    const doctorProfile = await DoctorProfile.findOne({ userId: doctorUserId }).populate('userId', 'name email role');
    if (!doctorProfile) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found' });
    }

    // Fetch reviews
    const reviews = await Review.find({ doctorId: doctorUserId })
      .populate('patientId', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        profile: doctorProfile,
        reviews,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create Stripe or Mock Checkout Session for medications
// @route   POST /api/patient/orders/checkout/:appointmentId
// @access  Private (Patient only)
export const checkoutMedicineOrder = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { shippingAddress } = req.body;
    
    const appointment = await Appointment.findById(appointmentId).populate('doctorId', 'name');
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (!appointment.prescription || !appointment.prescription.medicines || appointment.prescription.medicines.length === 0) {
      return res.status(400).json({ success: false, message: 'No prescription available for this appointment' });
    }

    // Dynamic price assignment based on medicine catalog
    const getMedicinePrice = (name) => {
      const lower = name.toLowerCase();
      if (lower.includes('amoxicillin')) return 18.50;
      if (lower.includes('paracetamol') || lower.includes('acetaminophen')) return 7.50;
      if (lower.includes('ibuprofen') || lower.includes('advil')) return 8.90;
      if (lower.includes('lipitor') || lower.includes('atorvastatin')) return 24.00;
      if (lower.includes('metformin')) return 11.20;
      if (lower.includes('aspirin')) return 6.00;
      if (lower.includes('cough') || lower.includes('syrup')) return 9.50;
      return 14.99; // standard fallback
    };

    const medicinesWithPrices = appointment.prescription.medicines.map((med) => {
      const price = getMedicinePrice(med.name);
      return {
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        duration: med.duration,
        price,
        quantity: 1,
      };
    });

    const totalAmount = parseFloat(medicinesWithPrices.reduce((sum, item) => sum + item.price, 0).toFixed(2));

    const order = await MedicineOrder.create({
      patientId: req.user._id,
      appointmentId,
      medicines: medicinesWithPrices,
      totalAmount,
      shippingAddress: shippingAddress || '123 Health Ave, Medical District',
      paymentStatus: 'unpaid',
      shippingStatus: 'processing',
    });

    if (stripe) {
      const lineItems = medicinesWithPrices.map((item) => ({
        price_data: {
          currency: 'usd',
          product_data: {
            name: `${item.name} (${item.dosage})`,
            description: `Dosage: ${item.frequency} for ${item.duration}`,
          },
          unit_amount: Math.round(item.price * 100),
        },
        quantity: 1,
      }));

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: lineItems,
        mode: 'payment',
        success_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/payment-success?order_id=${order._id}&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/appointments`,
        metadata: {
          orderId: order._id.toString(),
        },
      });

      order.stripeSessionId = session.id;
      await order.save();

      return res.json({ success: true, url: session.url });
    } else {
      const mockCheckoutUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/patient/pharmacy-checkout/${order._id}`;
      return res.json({ success: true, url: mockCheckoutUrl, isMock: true });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Verify Stripe or Mock payment for a medicine order
// @route   POST /api/patient/orders/verify
// @access  Private (Patient only)
export const verifyMedicineOrder = async (req, res) => {
  try {
    const { orderId, sessionId, isMock } = req.body;
    const order = await MedicineOrder.findById(orderId).populate('appointmentId');
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    if (stripe && sessionId && !isMock) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (session.payment_status !== 'paid') {
        return res.status(400).json({ success: false, message: 'Payment has not been completed' });
      }
    }

    order.paymentStatus = 'paid';

    // ── Auto-assign delivery partner from realistic pool ──
    const deliveryPartners = [
      { name: 'Rajesh Kumar', phone: '+91 98765 43210', vehicleType: 'Bike', vehicleNumber: 'DL-12 AB 3456', rating: 4.8, totalDeliveries: 1247 },
      { name: 'Amit Sharma', phone: '+91 87654 32109', vehicleType: 'Scooter', vehicleNumber: 'MH-04 CD 7890', rating: 4.6, totalDeliveries: 892 },
      { name: 'Priya Singh', phone: '+91 76543 21098', vehicleType: 'Bike', vehicleNumber: 'KA-05 EF 1234', rating: 4.9, totalDeliveries: 2103 },
      { name: 'Vikram Yadav', phone: '+91 65432 10987', vehicleType: 'Van', vehicleNumber: 'UP-32 GH 5678', rating: 4.7, totalDeliveries: 1589 },
      { name: 'Sneha Patel', phone: '+91 54321 09876', vehicleType: 'Scooter', vehicleNumber: 'GJ-01 IJ 9012', rating: 4.5, totalDeliveries: 673 },
      { name: 'Arjun Reddy', phone: '+91 93456 78901', vehicleType: 'Bike', vehicleNumber: 'TS-08 KL 3456', rating: 4.8, totalDeliveries: 1834 },
    ];
    const selectedPartner = deliveryPartners[Math.floor(Math.random() * deliveryPartners.length)];
    order.deliveryPartner = selectedPartner;

    // ── Auto-set estimated delivery date (3-5 days from now) ──
    const deliveryDays = 3 + Math.floor(Math.random() * 3); // 3-5 days
    const now = new Date();
    const estimatedDate = new Date(now.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
    order.estimatedDeliveryDate = estimatedDate;

    // ── Auto-generate tracking number ──
    const trkId = 'TRK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase();
    order.trackingNumber = trkId;

    // ── Auto-set current location ──
    order.currentLocation = order.originHub || 'MediConnect Central Pharmacy';

    // ── Auto-generate realistic 6-stop journey route ──
    const totalMs = estimatedDate.getTime() - now.getTime();
    order.journeyRoute = [
      {
        stopName: order.originHub || 'MediConnect Central Pharmacy',
        stopType: 'origin',
        estimatedArrival: now,
        actualArrival: now,
        status: 'current',
        distanceFromPrevKm: 0,
      },
      {
        stopName: 'Regional Sorting Facility',
        stopType: 'sorting',
        estimatedArrival: new Date(now.getTime() + totalMs * 0.15),
        status: 'upcoming',
        distanceFromPrevKm: 45,
      },
      {
        stopName: 'City Distribution Hub',
        stopType: 'hub',
        estimatedArrival: new Date(now.getTime() + totalMs * 0.4),
        status: 'upcoming',
        distanceFromPrevKm: 120,
      },
      {
        stopName: 'Local Delivery Station',
        stopType: 'local',
        estimatedArrival: new Date(now.getTime() + totalMs * 0.7),
        status: 'upcoming',
        distanceFromPrevKm: 25,
      },
      {
        stopName: 'Last Mile — Out for Delivery',
        stopType: 'last_mile',
        estimatedArrival: new Date(now.getTime() + totalMs * 0.9),
        status: 'upcoming',
        distanceFromPrevKm: 8,
      },
      {
        stopName: order.shippingAddress || 'Patient Address',
        stopType: 'destination',
        estimatedArrival: estimatedDate,
        status: 'upcoming',
        distanceFromPrevKm: 3,
      },
    ];

    // ── Auto-generate rich initial tracking timeline ──
    order.trackingUpdates = [
      {
        status: 'processing',
        activity: 'Order placed & payment verified. Your prescription is being reviewed by our pharmacy team.',
        location: order.originHub || 'MediConnect Central Pharmacy',
        timestamp: now,
      },
      {
        status: 'processing',
        activity: `Delivery partner ${selectedPartner.name} assigned. Estimated delivery by ${estimatedDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.`,
        location: order.originHub || 'MediConnect Central Pharmacy',
        timestamp: new Date(now.getTime() + 60000), // 1 minute later
      },
    ];

    await order.save();

    res.json({ success: true, message: 'Pharmacy order paid successfully!', data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get patient's pharmacy orders
// @route   GET /api/patient/orders
// @access  Private (Patient only)
export const getMedicineOrders = async (req, res) => {
  try {
    const orders = await MedicineOrder.find({ patientId: req.user._id })
      .populate({
        path: 'appointmentId',
        populate: {
          path: 'doctorId',
          select: 'name email',
        },
      })
      .sort({ createdAt: -1 });

    // Auto-populate tracking data for old orders that are missing it
    const deliveryPartners = [
      { name: 'Rajesh Kumar', phone: '+91 98765 43210', vehicleType: 'Bike', vehicleNumber: 'DL-12 AB 3456', rating: 4.8, totalDeliveries: 1247 },
      { name: 'Amit Sharma', phone: '+91 87654 32109', vehicleType: 'Scooter', vehicleNumber: 'MH-04 CD 7890', rating: 4.6, totalDeliveries: 892 },
      { name: 'Priya Singh', phone: '+91 76543 21098', vehicleType: 'Bike', vehicleNumber: 'KA-05 EF 1234', rating: 4.9, totalDeliveries: 2103 },
      { name: 'Vikram Yadav', phone: '+91 65432 10987', vehicleType: 'Van', vehicleNumber: 'UP-32 GH 5678', rating: 4.7, totalDeliveries: 1589 },
      { name: 'Sneha Patel', phone: '+91 54321 09876', vehicleType: 'Scooter', vehicleNumber: 'GJ-01 IJ 9012', rating: 4.5, totalDeliveries: 673 },
      { name: 'Arjun Reddy', phone: '+91 93456 78901', vehicleType: 'Bike', vehicleNumber: 'TS-08 KL 3456', rating: 4.8, totalDeliveries: 1834 },
    ];

    for (const order of orders) {
      if (order.paymentStatus === 'paid' && (!order.deliveryPartner || !order.deliveryPartner.name)) {
        const selectedPartner = deliveryPartners[Math.floor(Math.random() * deliveryPartners.length)];
        const now = new Date();
        const deliveryDays = 3 + Math.floor(Math.random() * 3);
        const estimatedDate = new Date(now.getTime() + deliveryDays * 24 * 60 * 60 * 1000);
        const totalMs = estimatedDate.getTime() - now.getTime();

        order.deliveryPartner = selectedPartner;
        order.estimatedDeliveryDate = order.estimatedDeliveryDate || estimatedDate;
        order.trackingNumber = order.trackingNumber || ('TRK' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).substring(2, 6).toUpperCase());
        order.currentLocation = order.currentLocation || (order.originHub || 'MediConnect Central Pharmacy');

        if (!order.journeyRoute || order.journeyRoute.length === 0) {
          const estDate = order.estimatedDeliveryDate;
          const tMs = estDate.getTime() - now.getTime();
          order.journeyRoute = [
            { stopName: order.originHub || 'MediConnect Central Pharmacy', stopType: 'origin', estimatedArrival: now, actualArrival: now, status: 'current', distanceFromPrevKm: 0 },
            { stopName: 'Regional Sorting Facility', stopType: 'sorting', estimatedArrival: new Date(now.getTime() + tMs * 0.15), status: 'upcoming', distanceFromPrevKm: 45 },
            { stopName: 'City Distribution Hub', stopType: 'hub', estimatedArrival: new Date(now.getTime() + tMs * 0.4), status: 'upcoming', distanceFromPrevKm: 120 },
            { stopName: 'Local Delivery Station', stopType: 'local', estimatedArrival: new Date(now.getTime() + tMs * 0.7), status: 'upcoming', distanceFromPrevKm: 25 },
            { stopName: 'Last Mile — Out for Delivery', stopType: 'last_mile', estimatedArrival: new Date(now.getTime() + tMs * 0.9), status: 'upcoming', distanceFromPrevKm: 8 },
            { stopName: order.shippingAddress || 'Patient Address', stopType: 'destination', estimatedArrival: estDate, status: 'upcoming', distanceFromPrevKm: 3 },
          ];
        }

        if (!order.trackingUpdates || order.trackingUpdates.length === 0) {
          order.trackingUpdates = [
            { status: 'processing', activity: 'Order placed & payment verified. Prescription under review.', location: order.originHub || 'MediConnect Central Pharmacy', timestamp: order.createdAt || now },
            { status: 'processing', activity: `Delivery partner ${selectedPartner.name} assigned. Estimated delivery by ${(order.estimatedDeliveryDate).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}.`, location: order.originHub || 'MediConnect Central Pharmacy', timestamp: new Date((order.createdAt || now).getTime() + 60000) },
          ];
        }

        await order.save();
      }
    }

    res.json({ success: true, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get specific medicine order details
// @route   GET /api/patient/orders/:orderId
// @access  Private (Patient only)
export const getMedicineOrderById = async (req, res) => {
  try {
    const order = await MedicineOrder.findById(req.params.orderId)
      .populate({
        path: 'appointmentId',
        populate: {
          path: 'doctorId',
          select: 'name email',
        },
      });

    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    if (order.patientId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized action' });
    }

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
