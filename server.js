  require("dotenv").config();
  const express = require("express");
  const connectDB = require("./config/db");
  const helmet = require("helmet");
  const cookieParser = require('cookie-parser');
  const cors = require("cors");
  const rateLimit = require("express-rate-limit");
  const mongoSanitize = require("express-mongo-sanitize");
  const hpp = require("hpp");
  const morgan = require('morgan');


  connectDB();
  const app = express();


  // ✅ Middlewares
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));
  app.use(helmet());
  app.use(mongoSanitize());
  app.use(hpp());
  app.use(
    cors({
      origin: ["http://localhost:5173"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE"],
      allowedHeaders: "Content-Type, Authorization, x-refresh-token",
    })
  );
  app.use(cookieParser());
  app.use(morgan("tiny"));

  // ✅ Rate Limiting
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    message: "Too many requests from this IP, please try again later.",
  });
  app.use(limiter);

  // ✅ Routes
  app.use("/api/auth", require("./routes/authRoutes"));
  app.use('/api/posts',require('./routes/postRoutes'));
  app.use('/api/users',require('./routes/userRoutes'));

  // ✅ Global Error Handler
  app.use((err, req, res, next) => {
    console.log(err);
    console.error("Error:", err.stack);
    res.status(500).json({ success: false, message: "Something went wrong!" });
  });

  // ✅ Start Express Server (No Socket.IO)
  app.listen(4000, () => {
    console.log("🚀 Server running on port 4000");
  });
