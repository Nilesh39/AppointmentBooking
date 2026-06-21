import User from '../models/User.js';
import PatientProfile from '../models/PatientProfile.js';
import DoctorProfile from '../models/DoctorProfile.js';
import Review from '../models/Review.js';
import { uploadFile } from '../utils/uploader.js';

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

// @desc    Delete medical record
// @route   DELETE /api/patient/records/:recordId
// @access  Private (Patient only)
export const deleteMedicalRecord = async (req, res) => {
  try {
    const profile = await PatientProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $pull: { medicalRecords: { _id: req.params.recordId } } },
      { new: true }
    );

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
    const { specialization, location, experience, maxFees, search, page = 1, limit = 10 } = req.query;

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

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const doctors = await DoctorProfile.find(query)
      .populate('userId', 'name email role')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ averageRating: -1, experience: -1 });

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
