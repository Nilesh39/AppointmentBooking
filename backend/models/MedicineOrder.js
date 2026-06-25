import mongoose from 'mongoose';

const medicineOrderSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      required: true,
    },
    medicines: [
      {
        name: {
          type: String,
          required: true,
        },
        dosage: {
          type: String,
          default: '',
        },
        frequency: {
          type: String,
          default: '',
        },
        duration: {
          type: String,
          default: '',
        },
        price: {
          type: Number,
          required: true,
        },
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    stripeSessionId: {
      type: String,
      default: '',
    },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid'],
      default: 'unpaid',
    },
    shippingStatus: {
      type: String,
      enum: ['processing', 'shipped', 'out_for_delivery', 'delivered'],
      default: 'processing',
    },
    shippingAddress: {
      type: String,
      default: '123 Health Ave, Medical District',
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    deliveryPartnerName: {
      type: String,
      default: '',
    },
    deliveryPartnerPhone: {
      type: String,
      default: '',
    },
    trackingNumber: {
      type: String,
      default: '',
    },
    trackingUpdates: [
      {
        status: {
          type: String,
          required: true,
        },
        activity: {
          type: String,
          required: true,
        },
        timestamp: {
          type: Date,
          default: Date.now,
        },
        location: {
          type: String,
          default: '',
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model('MedicineOrder', medicineOrderSchema);
