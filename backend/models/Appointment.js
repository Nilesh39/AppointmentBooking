import mongoose from 'mongoose';

const prescriptionSchema = new mongoose.Schema({
  text: String,
  medicines: [
    {
      name: String,
      dosage: String, // e.g. "500mg"
      frequency: String, // e.g. "1-0-1" or "Once daily"
      duration: String, // e.g. "5 days"
    }
  ],
  pdfUrl: String, // uploaded prescription PDF link
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const appointmentSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: String, // Format: YYYY-MM-DD
      required: true,
    },
    timeSlot: {
      type: String, // e.g., "10:30 AM"
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'rejected', 'cancelled', 'completed'],
      default: 'pending',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'refunded'],
      default: 'unpaid',
    },
    stripeSessionId: {
      type: String,
    },

    prescription: prescriptionSchema,
    invoiceUrl: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      required: true,
    },
    rescheduleRequest: {
      requestedBy: { type: String, enum: ['patient', 'doctor', ''] },
      newDate: String,
      newTimeSlot: String,
      reason: String,
    }
  },
  {
    timestamps: true,
  }
);

// Compound index to prevent double booking the same doctor at the same date and slot
appointmentSchema.index({ doctorId: 1, date: 1, timeSlot: 1, status: 1 }, { unique: false });

const Appointment = mongoose.model('Appointment', appointmentSchema);
export default Appointment;
