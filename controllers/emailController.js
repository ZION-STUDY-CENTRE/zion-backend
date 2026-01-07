const nodemailer = require('nodemailer');

const sendEmail = async (req, res) => {
  const { type, data } = req.body;

  // Create Transporter (Using Gmail as an example)
  // For production, it's safer to use environment variables
  const transporter = nodemailer.createTransport({
    service: 'gmail', // You can use other services like SendGrid, Outlook, etc.
    auth: {
      user: process.env.EMAIL_USER, // Your email address
      pass: process.env.EMAIL_PASS, // Your email app password (not your login password)
    },
    tls: {
      rejectUnauthorized: false
    }
  });

  let subject = '';
  let htmlContent = '';

  // Format email based on form type
  if (type === 'contact') {
    subject = `Message from ${data.name}: ${data.subject}`;
    htmlContent = `
      <h3>New Contact Inquiry</h3>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>phone Number:</strong> ${data.phone}</p>
      <p><strong>Message:</strong></p>
      <p>${data.message}</p>
    `;
  } else if (type === 'admission') {
    subject = `New Admission Application: ${data.firstName} ${data.lastName}`;
    htmlContent = `
      <h3>New Admission Application</h3>
      <h4>Personal Information</h4>
      <p><strong>Name:</strong> ${data.firstName} ${data.lastName}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
      <p><strong>Address:</strong> ${data.address}</p>
      
      <h4>Program Details</h4>
      <p><strong>Program Category:</strong> ${data.programCategory}</p>
      <p><strong>Selected Program:</strong> ${data.program}</p>
      
      <h4>preferred schedule: ${data.schedule}</h4>
      
      <p><strong>Adiditional Information:</strong> ${data.additional}</p>
    `;
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_reciever || process.env.EMAIL_USER, // Send to yourself
    subject: subject,
    html: htmlContent,
  };

  try {
    await transporter.sendMail(mailOptions);
    res.status(200).json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};

module.exports = { sendEmail };