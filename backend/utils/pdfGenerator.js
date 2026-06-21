import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

/**
 * Helper to ensure the document writing resolves fully
 */
const finalizeDoc = (doc, writeStream) => {
  return new Promise((resolve, reject) => {
    writeStream.on('finish', () => resolve(true));
    writeStream.on('error', (err) => reject(err));
    doc.end();
  });
};

/**
 * Generates an Invoice PDF for an appointment.
 */
export const generateInvoicePDF = async (appointment, patientUser, doctorUser, doctorProfile) => {
  const filename = `invoice-${appointment._id}.pdf`;
  const filePath = path.join('./public/documents', filename);
  const writeStream = fs.createWriteStream(filePath);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(writeStream);

  // Colors
  const primaryColor = '#2563EB';
  const textColor = '#1E293B';
  const lightBg = '#F8FAFC';
  const accentColor = '#0EA5E9';

  // --- Header ---
  doc.fillColor(primaryColor).fontSize(26).text('MediConnect', 50, 50, { bold: true });
  doc.fillColor(textColor).fontSize(10).text('Premium Healthcare Network', 50, 80);
  doc.fontSize(10).text('Email: billing@mediconnect.com | Tel: +1 800-555-0199', 50, 95);

  doc.fillColor(textColor).fontSize(18).text('INVOICE', 400, 50, { align: 'right' });
  doc.fontSize(10)
     .text(`Invoice ID: INV-${appointment._id.toString().slice(-6).toUpperCase()}`, 400, 75, { align: 'right' })
     .text(`Date: ${new Date().toLocaleDateString()}`, 400, 90, { align: 'right' })
     .text(`Payment Status: ${appointment.paymentStatus.toUpperCase()}`, 400, 105, { align: 'right', colors: appointment.paymentStatus === 'paid' ? '#14B8A6' : '#EF4444' });

  doc.moveTo(50, 130).lineTo(560, 130).strokeColor('#E2E8F0').stroke();

  // --- Bill To & Doctor ---
  doc.fontSize(12).fillColor(primaryColor).text('PATIENT DETAILS', 50, 150);
  doc.fontSize(10).fillColor(textColor)
     .text(`Name: ${patientUser.name}`, 50, 170)
     .text(`Email: ${patientUser.email}`, 50, 185);

  doc.fontSize(12).fillColor(primaryColor).text('PROVIDER DETAILS', 300, 150);
  doc.fontSize(10).fillColor(textColor)
     .text(`Doctor: Dr. ${doctorUser.name}`, 300, 170)
     .text(`Specialization: ${doctorProfile.specialization}`, 300, 185)
     .text(`Location: ${doctorProfile.location}`, 300, 200);

  doc.moveTo(50, 230).lineTo(560, 230).strokeColor('#E2E8F0').stroke();

  // --- Appointment Info ---
  doc.fontSize(12).fillColor(primaryColor).text('APPOINTMENT SUMMARY', 50, 250);
  doc.fontSize(10).fillColor(textColor)
     .text(`Booking Reference: ${appointment._id}`, 50, 270)
     .text(`Appointment Date: ${appointment.date}`, 50, 285)
     .text(`Scheduled Time: ${appointment.timeSlot}`, 50, 300);

  // --- Table Header ---
  doc.rect(50, 340, 510, 25).fill(lightBg);
  doc.fillColor(primaryColor).fontSize(10).text('Service Description', 60, 348);
  doc.text('Duration', 380, 348);
  doc.text('Amount', 480, 348, { align: 'right' });

  // --- Table Body ---
  doc.fillColor(textColor).fontSize(10).text(`General Consultation - Dr. ${doctorUser.name}`, 60, 380);
  doc.text('30 Mins', 380, 380);
  doc.text(`$${appointment.amount.toFixed(2)}`, 480, 380, { align: 'right' });

  doc.moveTo(50, 410).lineTo(560, 410).strokeColor('#E2E8F0').stroke();

  // --- Summary Totals ---
  doc.fontSize(10).text('Subtotal:', 380, 430);
  doc.text(`$${appointment.amount.toFixed(2)}`, 480, 430, { align: 'right' });
  doc.text('Taxes & Levies (0%):', 380, 445);
  doc.text('$0.00', 480, 445, { align: 'right' });

  doc.fontSize(12).fillColor(primaryColor).text('Total Amount Due:', 380, 470, { bold: true });
  doc.text(`$${appointment.amount.toFixed(2)}`, 480, 470, { align: 'right', bold: true });

  // --- Footer ---
  doc.fillColor('#94A3B8').fontSize(9).text('Thank you for choosing MediConnect. Wish you a healthy recovery!', 50, 650, { align: 'center' });
  doc.text('This is a computer generated invoice and does not require a physical signature.', 50, 665, { align: 'center' });

  await finalizeDoc(doc, writeStream);
  return `/documents/${filename}`;
};

/**
 * Generates a Prescription PDF for an appointment.
 */
export const generatePrescriptionPDF = async (appointment, patientUser, doctorUser, doctorProfile) => {
  const filename = `prescription-${appointment._id}.pdf`;
  const filePath = path.join('./public/documents', filename);
  const writeStream = fs.createWriteStream(filePath);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(writeStream);

  const primaryColor = '#14B8A6'; // Accent Teal
  const textColor = '#1E293B';
  const lightBg = '#F0FDFA';

  // --- Header ---
  doc.fillColor(primaryColor).fontSize(24).text(`Dr. ${doctorUser.name}`, 50, 50, { bold: true });
  doc.fillColor(textColor).fontSize(11)
     .text(`${doctorProfile.specialization} | ${doctorProfile.education}`, 50, 75)
     .text(`Clinic: ${doctorProfile.location}`, 50, 90);

  doc.fillColor(textColor).fontSize(18).text('PRESCRIPTION', 400, 50, { align: 'right' });
  doc.fontSize(10)
     .text(`Rx ID: RX-${appointment._id.toString().slice(-6).toUpperCase()}`, 400, 75, { align: 'right' })
     .text(`Date: ${new Date().toLocaleDateString()}`, 400, 90, { align: 'right' });

  doc.moveTo(50, 120).lineTo(560, 120).strokeColor('#CCFBF1').stroke();

  // --- Patient details bar ---
  doc.rect(50, 135, 510, 40).fill(lightBg);
  doc.fillColor(textColor).fontSize(10)
     .text(`Patient: ${patientUser.name}`, 65, 150)
     .text(`Age/Gender: N/A`, 250, 150)
     .text(`Ref ID: PAT-${patientUser._id.toString().slice(-6).toUpperCase()}`, 400, 150);

  // Rx symbol
  doc.fillColor(primaryColor).fontSize(32).text('Rx', 50, 200, { bold: true });

  // Custom text if written
  let currentY = 250;
  if (appointment.prescription && appointment.prescription.text) {
    doc.fillColor(textColor).fontSize(11).text(appointment.prescription.text, 50, currentY);
    currentY += doc.heightOfString(appointment.prescription.text) + 30;
  }

  // Medicines List Table
  if (appointment.prescription && appointment.prescription.medicines && appointment.prescription.medicines.length > 0) {
    doc.fillColor(primaryColor).fontSize(12).text('MEDICATION PLAN', 50, currentY, { underline: true });
    currentY += 20;

    // Header
    doc.rect(50, currentY, 510, 20).fill('#F0FDFA');
    doc.fillColor(textColor).fontSize(10)
       .text('Medicine Name', 60, currentY + 5, { bold: true })
       .text('Dosage', 240, currentY + 5, { bold: true })
       .text('Frequency', 340, currentY + 5, { bold: true })
       .text('Duration', 460, currentY + 5, { bold: true });
    
    currentY += 25;

    // Items
    appointment.prescription.medicines.forEach((med) => {
      doc.fillColor(textColor).fontSize(10)
         .text(med.name, 60, currentY)
         .text(med.dosage, 240, currentY)
         .text(med.frequency, 340, currentY)
         .text(med.duration, 460, currentY);

      doc.moveTo(50, currentY + 15).lineTo(560, currentY + 15).strokeColor('#E2E8F0').stroke();
      currentY += 25;
    });
  }

  // Signature
  doc.fontSize(10).text(`Dr. ${doctorUser.name}`, 400, 620, { align: 'center', bold: true });
  doc.moveTo(380, 615).lineTo(530, 615).strokeColor('#1E293B').stroke();
  doc.fontSize(8).text('Authorized Digital Signature', 400, 635, { align: 'center', italic: true });

  // Footer
  doc.fillColor('#94A3B8').fontSize(9).text('Please visit a chemist with this digital prescription printout.', 50, 670, { align: 'center' });

  await finalizeDoc(doc, writeStream);
  return `/documents/${filename}`;
};
