import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import Appointment from '../models/Appointment.js';
import Review from '../models/Review.js';
import Notification from '../models/Notification.js';
import Message from '../models/Message.js';
import { generateInvoicePDF, generatePrescriptionPDF } from '../utils/pdfGenerator.js';

dotenv.config();

const specializations = [
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
];

const availabilityDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const timeSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:00 PM', '04:00 PM'];

const seedDatabase = async () => {
  try {
    console.log('Connecting to database...');
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mediconnect');
    console.log('Connected. Clearing collections...');

    // Clear existing data
    await User.deleteMany();
    await DoctorProfile.deleteMany();
    await PatientProfile.deleteMany();
    await Appointment.deleteMany();
    await Review.deleteMany();
    await Notification.deleteMany();
    await Message.deleteMany();

    console.log('Collections cleared. Seeding Admin...');
    
    // 1. Seed Admin
    const adminUser = await User.create({
      name: 'MediConnect Admin',
      email: 'admin@mediconnect.com',
      password: 'password123',
      role: 'admin',
      isVerified: true,
    });

    console.log('Admin seeded. Seeding Doctors...');

    // 2. Seed 10 Doctors
    const doctors = [];
    const doctorProfiles = [];
    for (let i = 1; i <= 10; i++) {
      const docUser = await User.create({
        name: `Dr. Sarah Jenkins ${i}`,
        email: `doctor${i}@mediconnect.com`,
        password: 'password123',
        role: 'doctor',
        isVerified: true,
      });

      const spec = specializations[i - 1];
      const docProf = await DoctorProfile.create({
        userId: docUser._id,
        specialization: spec,
        location: `${i * 100} Medical Plaza, Suite ${i}0${i}, New York`,
        experience: 5 + i,
        fees: 50 + (i * 15),
        bio: `Experienced specialist in ${spec} dedicated to providing compassionate, evidence-based care. Focused on clinical excellence and patient empowerment.`,
        education: `MD - Harvard Medical School, Residency in ${spec}`,
        status: 'approved',
        availabilitySlots: availabilityDays.map(day => ({
          day,
          slots: timeSlots
        })),
        averageRating: 0,
        ratingsCount: 0,
      });

      doctors.push(docUser);
      doctorProfiles.push(docProf);
    }

    console.log('Doctors seeded. Seeding Patients...');

    // 3. Seed 20 Patients
    const patients = [];
    const patientProfiles = [];
    for (let i = 1; i <= 20; i++) {
      const patUser = await User.create({
        name: `Patient John Doe ${i}`,
        email: `patient${i}@mediconnect.com`,
        password: 'password123',
        role: 'patient',
        isVerified: true,
      });

      const patProf = await PatientProfile.create({
        userId: patUser._id,
        phone: `+1 555-01${i.toString().padStart(2, '0')}`,
        gender: i % 2 === 0 ? 'male' : 'female',
        dob: new Date(1980 + i, i % 12, i * 1.5),
        favouriteDoctors: [doctors[i % 10]._id],
        medicineReminders: [
          {
            medicineName: 'Vitamin D3',
            dosage: '1000 IU',
            time: '08:00 AM',
            days: ['Monday', 'Thursday'],
          }
        ]
      });

      patients.push(patUser);
      patientProfiles.push(patProf);
    }

    console.log('Patients seeded. Seeding 50 Appointments...');

    // 4. Seed 50 Appointments with varying statuses and PDFs
    const statuses = ['completed', 'accepted', 'pending', 'cancelled'];
    const pastDates = ['2026-06-10', '2026-06-15', '2026-06-18', '2026-06-20'];
    const futureDates = ['2026-06-25', '2026-06-28', '2026-07-02', '2026-07-05'];

    for (let i = 1; i <= 50; i++) {
      const patient = patients[i % 20];
      const doctor = doctors[i % 10];
      const docProf = doctorProfiles[i % 10];

      // Determine date and status
      let date = '';
      let status = '';
      let paymentStatus = 'unpaid';

      if (i <= 20) {
        // Completed past appointments
        date = pastDates[i % pastDates.length];
        status = 'completed';
        paymentStatus = 'paid';
      } else if (i <= 35) {
        // Confirmed paid future appointments
        date = futureDates[i % futureDates.length];
        status = 'accepted';
        paymentStatus = 'paid';
      } else if (i <= 45) {
        // Unpaid pending appointments
        date = futureDates[i % futureDates.length];
        status = 'pending';
        paymentStatus = 'unpaid';
      } else {
        // Cancelled appointments
        date = futureDates[i % futureDates.length];
        status = 'cancelled';
        paymentStatus = 'unpaid';
      }

      const slot = timeSlots[i % timeSlots.length];

      const appointment = new Appointment({
        patientId: patient._id,
        doctorId: doctor._id,
        date,
        timeSlot: slot,
        status,
        paymentStatus,
        amount: docProf.fees,
        videoLink: paymentStatus === 'paid' ? `https://meet.jit.si/mediconnect-${i}` : '',
      });

      // Write mock prescriptions & reviews for completed appointments
      if (status === 'completed') {
        appointment.prescription = {
          text: 'Take prescribed tablets daily after breakfast. Hydrate well and rest.',
          medicines: [
            {
              name: 'Amoxicillin',
              dosage: '500mg',
              frequency: '1-0-1',
              duration: '5 days',
            },
            {
              name: 'Paracetamol',
              dosage: '650mg',
              frequency: 'As needed',
              duration: '3 days',
            }
          ]
        };

        // Seed some PDF documents
        try {
          const invoiceUrl = await generateInvoicePDF(appointment, patient, doctor, docProf);
          const prescriptionUrl = await generatePrescriptionPDF(appointment, patient, doctor, docProf);
          appointment.invoiceUrl = invoiceUrl;
          appointment.prescription.pdfUrl = prescriptionUrl;
        } catch (pdfErr) {
          console.error(`PDF generation skipped for index ${i}:`, pdfErr.message);
        }

        // Add a review
        const rating = 4 + (i % 2); // 4 or 5 star reviews
        const comment = `Excellent consult with Dr. ${doctor.name}. Very patient and detail-oriented.`;
        
        await Review.create({
          patientId: patient._id,
          doctorId: doctor._id,
          rating,
          comment,
        });
      } else if (paymentStatus === 'paid') {
        // Paid future appointments get invoice generated
        try {
          const invoiceUrl = await generateInvoicePDF(appointment, patient, doctor, docProf);
          appointment.invoiceUrl = invoiceUrl;
        } catch (pdfErr) {
          console.error(`Invoice PDF generation skipped for index ${i}`);
        }
      }

      await appointment.save();
    }

    console.log('Seeded appointments and reviews.');
    console.log('Recalculating doctor average ratings...');

    // Run average rating updates for doctors
    for (const doc of doctors) {
      await Review.getAverageRating(doc._id);
    }

    console.log('Database seeding completed successfully!');
    mongoose.disconnect();
  } catch (error) {
    console.error('Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
