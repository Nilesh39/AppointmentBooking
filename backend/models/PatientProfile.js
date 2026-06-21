import mongoose from 'mongoose';

const patientProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', ''],
      default: '',
    },
    dob: {
      type: Date,
    },
    profilePic: {
      type: String,
      default: 'https://res.cloudinary.com/dztxhre5x/image/upload/v1625686000/default-avatar.png',
    },
    favouriteDoctors: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    medicalRecords: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    medicineReminders: [
      {
        medicineName: { type: String, required: true },
        dosage: { type: String, required: true },
        time: { type: String, required: true }, // e.g. "08:00 AM" or "20:00"
        days: [{ type: String }], // e.g. ["Monday", "Tuesday"]
      },
    ],
  },
  {
    timestamps: true,
  }
);

const PatientProfile = mongoose.model('PatientProfile', patientProfileSchema);
export default PatientProfile;
