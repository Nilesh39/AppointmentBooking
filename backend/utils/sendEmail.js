import nodemailer from 'nodemailer';

const sendEmail = async (options) => {
  const isSmtpConfigured = process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS;

  if (!isSmtpConfigured) {
    console.log('\n--- [EMAIL LOGGER FALLBACK] ---');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Body:\n${options.message || options.html}`);
    console.log('--------------------------------\n');
    return { mockSent: true };
  }

  const transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT || '587'),
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MediConnect <noreply@mediconnect.com>',
    to: options.email,
    subject: options.subject,
    html: options.html,
    text: options.message,
  };

  return await transporter.sendMail(mailOptions);
};

export default sendEmail;
