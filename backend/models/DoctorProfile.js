import mongoose from 'mongoose';

const availabilitySlotSchema = new mongoose.Schema({
  day: {
    type: String,
    required: true,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  },
  slots: [
    {
      type: String, // e.g., "09:00 AM", "09:30 AM"
    }
  ]
});

const doctorProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: [true, 'Please select a specialization'],
      enum: [
        'Cardiologist',
        'Dermatologist',
        'Neurologist',
        'Orthopedic',
        'Psychiatrist',
        'Pediatrician',
        'Dentist',
        'Gynecologist',
        'ENT Specialist',
        'General Physician',
      ],
    },
    location: {
      type: String,
      required: [true, 'Please add a location/clinic address'],
      trim: true,
    },
    experience: {
      type: Number,
      required: [true, 'Please add years of experience'],
      min: [0, 'Experience cannot be negative'],
    },
    fees: {
      type: Number,
      required: [true, 'Please specify consulting fees'],
      min: [0, 'Fees cannot be negative'],
    },
    bio: {
      type: String,
      required: [true, 'Please add a short biography'],
      trim: true,
    },
    education: {
      type: String,
      required: [true, 'Please add education details'],
      trim: true,
    },
    certificates: [
      {
        type: String, // URL to certificate document
      },
    ],
    status: {
      type: String,
      enum: ['pending', 'approved', 'suspended', 'rejected'],
      default: 'pending',
    },
    availabilitySlots: [availabilitySlotSchema],
    averageRating: {
      type: Number,
      default: 0,
    },
    ratingsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

const DoctorProfile = mongoose.model('DoctorProfile', doctorProfileSchema);
export default DoctorProfile;
