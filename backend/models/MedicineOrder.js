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
      enum: ['processing', 'packed', 'shipped', 'in_transit', 'out_for_delivery', 'delivered'],
      default: 'processing',
    },
    shippingAddress: {
      type: String,
      default: '123 Health Ave, Medical District',
    },
    estimatedDeliveryDate: {
      type: Date,
    },
    // Delivery partner full profile
    deliveryPartner: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      vehicleType: { type: String, default: '' },
      vehicleNumber: { type: String, default: '' },
      rating: { type: Number, default: 4.5 },
      totalDeliveries: { type: Number, default: 0 },
    },
    trackingNumber: {
      type: String,
      default: '',
    },
    // Origin and destination for journey route
    originHub: {
      type: String,
      default: 'MediConnect Central Pharmacy',
    },
    currentLocation: {
      type: String,
      default: '',
    },
    // Full journey route with all stops
    journeyRoute: [
      {
        stopName: { type: String, required: true },
        stopType: {
          type: String,
          enum: ['origin', 'hub', 'sorting', 'local', 'last_mile', 'destination'],
          default: 'hub',
        },
        estimatedArrival: { type: Date },
        actualArrival: { type: Date },
        status: {
          type: String,
          enum: ['upcoming', 'current', 'completed'],
          default: 'upcoming',
        },
        distanceFromPrevKm: { type: Number, default: 0 },
      },
    ],
    // Tracking updates timeline
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
