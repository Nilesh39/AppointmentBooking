import nodemailer from 'nodemailer';

const wrapWithPremiumTemplate = (contentHtml, subject) => {
  // Dynamically convert standard basic elements to premium components
  let styledContent = contentHtml
    // Beautify simple links with the premium button class
    .replace(/<a\s+href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, (match, url, text) => {
      if (text.toLowerCase().includes('cancel') || text.toLowerCase().includes('ignore')) {
        return `<a href="${url}" target="_blank" style="display: inline-block; padding: 12px 24px; background-color: #e2e8f0; color: #475569; text-decoration: none; border-radius: 12px; font-weight: 700; margin: 15px 5px; font-size: 14px; text-align: center;">${text}</a>`;
      }
      return `<a href="${url}" target="_blank" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: #ffffff; text-decoration: none; border-radius: 12px; font-weight: 700; margin: 15px 5px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2); font-size: 14px; text-align: center; border: none;">${text}</a>`;
    });

  // Extract structured key-value bullet points or strong rows to wrap them in a nice details card
  const strongDetailsMatch = styledContent.match(/<p><strong>([^:]+):<\/strong>([^<]+)<\/p>/gi);
  if (strongDetailsMatch) {
    let rowsHtml = '';
    strongDetailsMatch.forEach(item => {
      const matchParts = item.match(/<strong>([^:]+):<\/strong>([^<]+)/i);
      if (matchParts) {
        const label = matchParts[1].trim();
        const value = matchParts[2].trim();
        rowsHtml += `
          <tr style="border-bottom: 1px dashed #e2e8f0;">
            <td style="padding: 10px 0; color: #64748b; font-weight: 600; font-size: 14px; text-align: left;">${label}</td>
            <td style="padding: 10px 0; color: #0f172a; font-weight: 700; font-size: 14px; text-align: right;">${value}</td>
          </tr>
        `;
      }
    });

    if (rowsHtml) {
      const tableWrapper = `
        <div style="background-color: #f8fafc; border-radius: 16px; padding: 20px; margin: 25px 0; border-left: 4px solid #3b82f6; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
          <table style="width: 100%; border-collapse: collapse;">
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>
        </div>
      `;
      // Remove the original raw paragraphs we matched
      strongDetailsMatch.forEach(item => {
        styledContent = styledContent.replace(item, '');
      });
      // Append table before buttons if any
      if (styledContent.includes('style="display: inline-block;')) {
        const buttonIndex = styledContent.indexOf('<a ');
        styledContent = styledContent.slice(0, buttonIndex) + tableWrapper + styledContent.slice(buttonIndex);
      } else {
        styledContent += tableWrapper;
      }
    }
  }

  return `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${subject}</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 0; -webkit-font-smoothing: antialiased;">
      <div style="max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.04); border: 1px solid #e2e8f0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 35px 30px; text-align: center; color: #ffffff;">
          <div style="font-size: 26px; font-weight: 800; letter-spacing: -0.75px; display: inline-flex; align-items: center; gap: 8px;">
            <span>🏥</span> MediConnect
          </div>
          <div style="margin-top: 6px; font-size: 13px; opacity: 0.85; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600;">
            Premium Healthcare Hub
          </div>
        </div>
        <!-- Content -->
        <div style="padding: 40px 35px; color: #334155; line-height: 1.6; font-size: 15px;">
          ${styledContent}
        </div>
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; font-size: 12px; color: #64748b; border-top: 1px solid #f1f5f9;">
          <div style="font-weight: bold; color: #475569; margin-bottom: 5px;">MediConnect Care Team</div>
          <p style="margin: 0 0 10px 0;">123 Health Ave, Medical District | Support: support@mediconnect.com</p>
          <p style="margin: 0; font-size: 10px; opacity: 0.7;">© ${new Date().getFullYear()} MediConnect. All rights reserved.</p>
        </div>
      </div>
    </body>
  </html>
  `;
};

const sendEmail = async (options) => {
  let transporter;

  const isSmtpConfigured = 
    process.env.EMAIL_HOST && 
    process.env.EMAIL_USER && 
    process.env.EMAIL_PASS && 
    !process.env.EMAIL_USER.includes('your_smtp_username') && 
    process.env.EMAIL_USER !== '';

  if (isSmtpConfigured) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  } else {
    // Generate Ethereal testing account on the fly for fully working interactive preview
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
    } catch (err) {
      console.log('Failed to create Ethereal account, falling back to console logger:', err.message);
      console.log('\n--- [EMAIL LOGGER FALLBACK] ---');
      console.log(`To:      ${options.email}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body:\n${options.message || options.html}`);
      console.log('--------------------------------\n');
      return { mockSent: true };
    }
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'MediConnect <noreply@mediconnect.com>',
    to: options.email,
    subject: options.subject,
    html: options.html ? wrapWithPremiumTemplate(options.html, options.subject) : undefined,
    text: options.message,
  };

  const info = await transporter.sendMail(mailOptions);
  
  if (!isSmtpConfigured) {
    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('\n✉️ --- [ETHEREAL TEST EMAIL SENT] ---');
    console.log(`To:      ${options.email}`);
    console.log(`Subject: ${options.subject}`);
    console.log(`Preview URL: ${previewUrl}`);
    console.log('-------------------------------------\n');
    return { previewUrl, messageId: info.messageId };
  }

  return info;
};

export default sendEmail;
