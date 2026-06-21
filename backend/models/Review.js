import mongoose from 'mongoose';
import DoctorProfile from './DoctorProfile.js';

const reviewSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // Refers to the doctor's User account
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    comment: {
      type: String,
      required: [true, 'Please add a comment'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent user from submitting more than one review per doctor
reviewSchema.index({ patientId: 1, doctorId: 1 }, { unique: true });

// Static method to get avg rating and update DoctorProfile
reviewSchema.statics.getAverageRating = async function (doctorId) {
  const obj = await this.aggregate([
    {
      $match: { doctorId }
    },
    {
      $group: {
        _id: '$doctorId',
        averageRating: { $avg: '$rating' },
        ratingsCount: { $sum: 1 }
      }
    }
  ]);

  try {
    if (obj.length > 0) {
      await DoctorProfile.findOneAndUpdate(
        { userId: doctorId },
        {
          averageRating: Math.round(obj[0].averageRating * 10) / 10,
          ratingsCount: obj[0].ratingsCount,
        }
      );
    } else {
      await DoctorProfile.findOneAndUpdate(
        { userId: doctorId },
        {
          averageRating: 0,
          ratingsCount: 0,
        }
      );
    }
  } catch (err) {
    console.error('Error recalculating average rating:', err);
  }
};

// Call getAverageRating after save
reviewSchema.post('save', async function () {
  await this.constructor.getAverageRating(this.doctorId);
});

// Call getAverageRating before remove
reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await this.constructor.getAverageRating(this.doctorId);
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
