import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';
import DoctorProfile from '../models/DoctorProfile.js';
import PatientProfile from '../models/PatientProfile.js';
import Appointment from '../models/Appointment.js';
import Message from '../models/Message.js';
import Notification from '../models/Notification.js';

dotenv.config();

const BASE_URL = 'http://localhost:5000/api';

// Helper to extract cookies from response headers and format them
function getCookieHeader(responseHeaders) {
  const setCookie = responseHeaders.get('set-cookie');
  if (!setCookie) return null;
  // Extract token cookie value
  const match = setCookie.match(/token=([^;]+)/);
  return match ? `token=${match[1]}` : null;
}

async function runTests() {
  console.log('Connecting to database for verification...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to database!');

  // Cleanup any old test users
  console.log('Cleaning up old test data...');
  await User.deleteMany({ email: { $in: ['test_pat@test.com', 'test_doc@test.com'] } });
  
  let patientCookie = '';
  let doctorCookie = '';
  let adminCookie = '';
  let testDoctorUserId = '';
  let testPatientUserId = '';
  let testAppointmentId = '';

  console.log('\n--- 1. Testing Patient Registration ---');
  const regPatRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Patient',
      email: 'test_pat@test.com',
      password: 'password123',
      role: 'patient',
    }),
  });
  const regPatData = await regPatRes.json();
  console.log('Patient Registration Status:', regPatRes.status);
  console.log('Patient Registration Body:', regPatData);
  if (!regPatData.success) throw new Error('Patient registration failed');

  console.log('\n--- 2. Testing Doctor Registration ---');
  const regDocRes = await fetch(`${BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Test Doctor',
      email: 'test_doc@test.com',
      password: 'password123',
      role: 'doctor',
      specialization: 'Cardiologist',
      location: 'New York',
      experience: '10',
      fees: '150',
      bio: 'Experienced cardiologist testing the application.',
      education: 'MD Cardiology',
    }),
  });
  const regDocData = await regDocRes.json();
  console.log('Doctor Registration Status:', regDocRes.status);
  console.log('Doctor Registration Body:', regDocData);
  if (!regDocData.success) throw new Error('Doctor registration failed');

  // Verify users in database directly (mocking email verification)
  console.log('Verifying users in DB directly (email verification bypass)...');
  const patientUser = await User.findOneAndUpdate({ email: 'test_pat@test.com' }, { isVerified: true }, { new: true });
  const doctorUser = await User.findOneAndUpdate({ email: 'test_doc@test.com' }, { isVerified: true }, { new: true });
  testDoctorUserId = doctorUser._id.toString();
  testPatientUserId = patientUser._id.toString();
  console.log(`Verified Patient: ${patientUser.name} (${testPatientUserId})`);
  console.log(`Verified Doctor: ${doctorUser.name} (${testDoctorUserId})`);

  console.log('\n--- 3. Testing Admin Login & Doctor Approval ---');
  // Login as admin
  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@mediconnect.com',
      password: 'password123',
      role: 'admin',
    }),
  });
  adminCookie = getCookieHeader(adminLoginRes.headers);
  console.log('Admin Login Cookie set:', !!adminCookie);
  
  // Approve doctor
  const approveRes = await fetch(`${BASE_URL}/admin/doctors/${testDoctorUserId}/approve`, {
    method: 'PUT',
    headers: { 
      'Content-Type': 'application/json',
      'Cookie': adminCookie
    },
  });
  const approveData = await approveRes.json();
  console.log('Approve Doctor Status:', approveRes.status);
  console.log('Approve Doctor Response:', approveData);
  if (!approveData.success) throw new Error('Admin failed to approve doctor');

  console.log('\n--- 4. Testing Doctor Login & Slot Setting ---');
  const docLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_doc@test.com',
      password: 'password123',
      role: 'doctor',
    }),
  });
  doctorCookie = getCookieHeader(docLoginRes.headers);
  console.log('Doctor Login Cookie set:', !!doctorCookie);

  // Set availability on Monday
  const setSlotsRes = await fetch(`${BASE_URL}/doctor/availability`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': doctorCookie
    },
    body: JSON.stringify({
      availabilitySlots: [
        { day: 'Monday', slots: ['09:00 AM', '10:00 AM'] },
      ]
    }),
  });
  const setSlotsData = await setSlotsRes.json();
  console.log('Set Slots Status:', setSlotsRes.status);
  console.log('Set Slots Response:', setSlotsData);
  if (!setSlotsData.success) throw new Error('Doctor failed to set availability');

  console.log('\n--- 5. Testing Patient Login & Booking ---');
  const patLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_pat@test.com',
      password: 'password123',
      role: 'patient',
    }),
  });
  patientCookie = getCookieHeader(patLoginRes.headers);
  console.log('Patient Login Cookie set:', !!patientCookie);

  // Book appointment slot
  const bookRes = await fetch(`${BASE_URL}/appointments/book`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': patientCookie
    },
    body: JSON.stringify({
      doctorId: testDoctorUserId,
      date: '2026-06-22', // Next Monday
      timeSlot: '09:00 AM',
    }),
  });
  const bookData = await bookRes.json();
  console.log('Book Appointment Status:', bookRes.status);
  console.log('Book Appointment Response:', bookData);
  if (!bookData.success) throw new Error('Patient booking reservation failed');
  testAppointmentId = bookData.appointment._id;

  // Mock checkout session payment completion
  console.log('Simulating payment verification (Mock Verification)...');
  const payRes = await fetch(`${BASE_URL}/appointments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': patientCookie
    },
    body: JSON.stringify({
      appointmentId: testAppointmentId,
      isMock: true,
    }),
  });
  const payData = await payRes.json();
  console.log('Mock Payment Verification Status:', payRes.status);
  console.log('Mock Payment Verification Response:', payData);
  if (!payData.success) throw new Error('Appointment mock payment verification failed');

  console.log('\n--- 6. Testing Patient-Doctor Chat ---');
  // Patient sends message to doctor
  const sendMsgRes = await fetch(`${BASE_URL}/chat/message`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': patientCookie
    },
    body: JSON.stringify({
      receiverId: testDoctorUserId,
      content: 'Hello Dr., I have booked a slot. See you soon.',
    }),
  });
  const sendMsgData = await sendMsgRes.json();
  console.log('Patient Send Message Status:', sendMsgRes.status);
  console.log('Patient Send Message Response:', sendMsgData);

  // Doctor fetches contacts list
  const docContactsRes = await fetch(`${BASE_URL}/chat/contacts`, {
    method: 'GET',
    headers: { 'Cookie': doctorCookie },
  });
  const docContactsData = await docContactsRes.json();
  console.log('Doctor Chat Contacts List Length:', docContactsData.length);

  // Doctor gets chat history with patient
  const historyRes = await fetch(`${BASE_URL}/chat/history/${testPatientUserId}`, {
    method: 'GET',
    headers: { 'Cookie': doctorCookie },
  });
  const historyData = await historyRes.json();
  console.log('Doctor fetched history with Patient. Messages Count:', historyData.length);
  console.log('Last message text:', historyData[historyData.length - 1]?.content);

  console.log('\n--- 7. Testing Doctor Writing Prescription ---');
  const presRes = await fetch(`${BASE_URL}/doctor/appointments/${testAppointmentId}/prescription`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': doctorCookie
    },
    body: JSON.stringify({
      text: 'Take rest and drink plenty of water.',
      medicines: [
        { name: 'Paracetamol', dosage: '500mg', frequency: 'Twice a day', duration: '5 days' },
      ],
    }),
  });
  const presData = await presRes.json();
  console.log('Write Prescription Status:', presRes.status);
  console.log('Write Prescription Response:', presData);
  if (!presData.success) throw new Error('Doctor failed to write prescription');

  console.log('\n--- 8. Testing Download Invoice ---');
  const invoiceRes = await fetch(`${BASE_URL}/appointments/${testAppointmentId}/invoice`, {
    method: 'GET',
    headers: { 'Cookie': patientCookie },
  });
  console.log('Invoice Download HTTP Status:', invoiceRes.status);
  console.log('Content-Type returned:', invoiceRes.headers.get('content-type'));

  console.log('\n--- 9. Cleaning Up Test Data ---');
  await Appointment.findByIdAndDelete(testAppointmentId);
  await Message.deleteMany({ $or: [{ senderId: testDoctorUserId }, { senderId: testPatientUserId }] });
  await Notification.deleteMany({ userId: { $in: [testDoctorUserId, testPatientUserId] } });
  await DoctorProfile.findOneAndDelete({ userId: testDoctorUserId });
  await PatientProfile.findOneAndDelete({ userId: testPatientUserId });
  await User.findByIdAndDelete(testDoctorUserId);
  await User.findByIdAndDelete(testPatientUserId);
  console.log('Test cleanups finished successfully!');

  console.log('\n======================================');
  console.log('   ALL E2E INTEGRATION TESTS PASSED!');
  console.log('======================================');
}

runTests()
  .then(() => {
    mongoose.disconnect();
    process.exit(0);
  })
  .catch((err) => {
    console.error('TEST SUITE CRASHED:', err);
    mongoose.disconnect();
    process.exit(1);
  });
