const nodemailer = require('nodemailer');
const Program = require('../models/Program');

// Corporate Identity Colors & Assets
const THEME = {
  primary: '#1e3a8a',
  secondary: '#b91c1c', 
  bg: '#f3f4f6', 
  surface: '#ffffff',
  text: '#1f2937',
  textLight: '#6b7280',
  logoUrl: 'https://zionstudycentrewebsiteui.vercel.app/logo.png'
};

const generateEmailTemplate = (title, content) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: ${THEME.bg}; }
        .container { max-width: 600px; margin: 0 auto; background-color: ${THEME.surface}; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background-color: ${THEME.primary}; padding: 30px 20px; text-align: center; }
        .header h1 { color: #ffffff; margin: 0; font-size: 24px; letter-spacing: 1px; }
        .accent-stripe { height: 4px; background-color: ${THEME.secondary}; width: 100%; }
        .content { padding: 40px 30px; color: ${THEME.text}; line-height: 1.6; }
        .field-group { margin-bottom: 20px; border-bottom: 1px solid #e5e7eb; padding-bottom: 15px; }
        .field-group:last-child { border-bottom: none; }
        .label { font-size: 12px; text-transform: uppercase; color: ${THEME.textLight}; font-weight: 600; margin-bottom: 4px; }
        .value { font-size: 16px; color: ${THEME.text}; font-weight: 500; }
        .footer { background-color: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: ${THEME.textLight}; border-top: 1px solid #e5e7eb; }
        .button { display: inline-block; padding: 12px 24px; background-color: ${THEME.secondary}; color: white; text-decoration: none; border-radius: 4px; font-weight: bold; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div style="padding: 20px;">
        <div class="container">
          <div class="header">
            <img src="${THEME.logoUrl}" alt="Zion Study Centre" style="height: 50px; margin-bottom: 10px;">
            <h1 style="font-family: serif;">ZION STUDY CENTRE</h1>
            <div style="color: #bfdbfe; font-size: 14px; margin-top: 5px;">LEADERSHIP ACADEMY</div>
          </div>
          <div class="accent-stripe"></div>
          
          <div class="content">
            <h2 style="color: ${THEME.primary}; margin-top: 0; border-bottom: 2px solid ${THEME.bg}; padding-bottom: 15px;">${title}</h2>
            ${content}
          </div>

          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} Zion Study Centre. All rights reserved.</p>
            <p>This is an automated notification from your website.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

const sendEmail = async (req, res) => {
  const { type, data } = req.body;

  console.log(`[Email Controller] Received Request: ${type} from ${data?.email}`);

  // 1. Validation of Env Vars
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.error('[Email Controller] Error: Missing Email Env Variables');
      return res.status(500).json({ message: 'Server Configuration Error: Missing Email Credentials' });
  }

  // 2. Create Transporter (Improved Config)
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false // Helps with some self-signed cert issues on cloud
    }
  });

  // Verify connection configuration
  try {
      await transporter.verify();
      console.log('[Email Controller] SMTP Connection Established');
  } catch (error) {
      console.error('[Email Controller] SMTP Connection Failed:', error);
      return res.status(500).json({ message: 'Failed to connect to email server', error: error.message });
  }

  let subject = '';
  let htmlContent = '';

  try {
  // Format email based on form type
  if (type === 'contact') {
    subject = `Message From: ${data.name} - ${data.subject}`;
    const bodyContent = `
      <div class="field-group">
        <div class="label">Sender Name</div>
        <div class="value">${data.name}</div>
      </div>
      <div class="field-group">
        <div class="label">Email Address</div>
        <div class="value"><a href="mailto:${data.email}" style="color: ${THEME.primary}; text-decoration: none;">${data.email}</a></div>
      </div>
      <div class="field-group">
        <div class="label">Phone Number</div>
        <div class="value">${data.phone || 'Not provided'}</div>
      </div>
      <div class="field-group">
        <div class="label">Message</div>
        <div class="value" style="white-space: pre-wrap;">${data.message}</div>
      </div>
    `;
    htmlContent = generateEmailTemplate('Contact Inquiry', bodyContent);

  } else if (type === 'admission') {
    subject = `Admission Application: ${data.firstName} ${data.lastName}`;
    const bodyContent = `
      <div style="background-color: #eff6ff; padding: 15px; border-radius: 6px; margin-bottom: 25px; border-left: 4px solid ${THEME.primary};">
        <div class="label" style="color: ${THEME.primary};">Program Applied For</div>
        <div class="value" style="font-size: 18px; color: ${THEME.primary};">${data.program}</div>
        <div style="font-size: 14px; color: ${THEME.textLight}; margin-top: 4px;">${data.programCategory} | ${data.schedule}</div>
      </div>

      <h3 style="color: ${THEME.secondary}; margin-bottom: 15px;">Applicant Details</h3>
      
      <div class="field-group">
        <div class="label">Full Name</div>
        <div class="value">${data.firstName} ${data.lastName}</div>
      </div>
      
      <div class="field-group">
        <div class="label">Contact Info</div>
        <div class="value">
          <a href="mailto:${data.email}" style="color: ${THEME.primary}; text-decoration: none;">${data.email}</a><br>
          ${data.phone}
        </div>
      </div>
      
      <div class="field-group">
        <div class="label">Address</div>
        <div class="value">${data.address}</div>
      </div>
      
      <div class="field-group">
        <div class="label">Additional Information</div>
        <div class="value" style="white-space: pre-wrap;">${data.additional || 'None provided'}</div>
      </div>
    `;
    htmlContent = generateEmailTemplate('Admission Application', bodyContent);

    // --- Student Confirmation Email Logic ---
    try {
        // Try to find the program details to include in the user's email
        let programDetails = null;
        if (data.program) {
            // Escape special characters for regex just in case
            const escapedProgram = data.program.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            programDetails = await Program.findOne({
                $or: [
                    { code: data.program },
                    { title: { $regex: new RegExp(`^${escapedProgram}$`, 'i') } }
                ]
            });
        }

        const programName = programDetails ? programDetails.title : (data.program || 'your selected program');
        
        let modulesHtml = '';
        if (programDetails && programDetails.modules && programDetails.modules.length > 0) {
            modulesHtml = `
              <div style="margin-top: 20px;">
                <h3 style="color: ${THEME.secondary}; font-size: 16px;">Course Structure</h3>
                <ul style="padding-left: 20px; color: ${THEME.text};">
                  ${programDetails.modules.map(m => `<li style="margin-bottom: 8px;"><strong>${m.title}</strong>: ${m.description}</li>`).join('')}
                </ul>
              </div>
            `;
        }

        let statsHtml = '';
        if (programDetails && programDetails.keyStats) {
            statsHtml = `
              <div style="background-color: #f8fafc; padding: 15px; border-radius: 6px; margin-top: 20px; border: 1px solid #e2e8f0;">
                <table style="width: 100%; font-size: 14px;">
                  <tr>
                    <td style="color: ${THEME.textLight}; padding-bottom: 5px;">Duration:</td>
                    <td style="font-weight: 600;">${programDetails.keyStats.duration || 'Flexible'}</td>
                  </tr>
                  <tr>
                    <td style="color: ${THEME.textLight}; padding-bottom: 5px;">Study Mode:</td>
                    <td style="font-weight: 600;">${programDetails.keyStats.studyMode || 'On-site'}</td>
                  </tr>
                  <tr>
                    <td style="color: ${THEME.textLight};">Certification:</td>
                    <td style="font-weight: 600;">${programDetails.keyStats.certification || 'Certificate of Completion'}</td>
                  </tr>
                </table>
              </div>
            `;
        }

        const studentSubject = `Application Received: ${programName}`;
        const studentBody = `
            <p>Dear ${data.firstName},</p>
            <p>Thank you for applying to <strong>${programName}</strong> at Zion Study Centre. We have successfully received your application details.</p>
            
            <p>Our admissions team will review your application and contact you shortly regarding the next steps.</p>

            ${programDetails ? `
              <h3 style="color: ${THEME.primary}; margin-top: 30px; border-bottom: 1px solid #e5e7eb; padding-bottom: 10px;">Program Details</h3>
              <p>${programDetails.shortDescription || programDetails.overview || ''}</p>
              ${statsHtml}
              ${modulesHtml}
            ` : ''}

            <div style="margin-top: 30px; padding-top: 20px; border-top: 1px dashed #e5e7eb;">
               <p style="font-size: 14px; color: ${THEME.textLight};">You applied with the following preferences:</p>
               <ul style="font-size: 14px; color: ${THEME.textLight};">
                 <li><strong>Schedule:</strong> ${data.schedule}</li>
                 <li><strong>Phone:</strong> ${data.phone}</li>
               </ul>
            </div>
        `;

        const studentEmailContent = generateEmailTemplate('Application Confirmation', studentBody);

        // Send Email to Student in background (don't await to block response, but for reliability we usually await or queue)
        // Here we will await to ensure it sends before finishing request, or push to array of promises.
        await transporter.sendMail({
            from: `"Zion Admissions" <${process.env.EMAIL_USER}>`,
            to: data.email,
            subject: studentSubject,
            html: studentEmailContent
        });

        } catch (err) {
            console.error("Failed to send student confirmation email:", err);
            // We continue because the admin notification is the critical part
        }
    } // Close if type == admission

    // If type is neither (unlikely but safe), we might arrive here.
    // Ensure we have content before sending.
    if (!htmlContent) throw new Error("Invalid email type or empty content");

  const mailOptions = {
    from: `"Zion Website" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_RECIEVER || process.env.EMAIL_reciever || process.env.EMAIL_USER,
    replyTo: data.email, // Allow direct reply to the user
    subject: subject,
    html: htmlContent,
  };

  await transporter.sendMail(mailOptions);
  res.status(200).json({ message: 'Email sent successfully' });

  } catch (error) {
    console.error('CRITICAL EMAIL ERROR:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message, stack: error.stack });
  }
};

module.exports = { sendEmail };