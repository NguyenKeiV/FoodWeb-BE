const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");

const { env, validateEnv } = require("./src/config/env");
const { initializeDatabase, sequelize } = require("./src/config/database");
validateEnv();

const app = express();

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      const allowedOrigins = Array.isArray(env.CORS.ORIGIN)
        ? env.CORS.ORIGIN
        : [env.CORS.ORIGIN];
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: env.CORS.CREDENTIALS,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));

// ⭐ THÊM: Serve static files cho uploads
app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// ✅ NEW: Health check endpoint for Render
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
  });
});

app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

const routes = require("./src/routes/index");
app.use("/api", routes);

app.use((err, req, res, next) => {
  console.error("Error:", err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// Initialize database and start server
const startServer = async () => {
  try {
    // Initialize Sequelize database
    await initializeDatabase();
    console.log("❤️  Database initialized successfully");

    // ✅ FIXED: Bind to 0.0.0.0 for Render
    app.listen(env.PORT, "0.0.0.0", () => {
      console.log(`🚀 Server is running on port ${env.PORT}`);
      console.log(`📍 Environment: ${env.NODE_ENV}`);
      console.log(
        `💾 Database: ${env.DATABASE.HOST}:${env.DATABASE.PORT}/${env.DATABASE.NAME}`
      );
      console.log(
        `🔄 Database Sync: ${env.DATABASE.SYNC ? "Enabled" : "Disabled"}`
      );
      console.log(
        `🌐 CORS Origins: ${
          Array.isArray(env.CORS.ORIGIN)
            ? env.CORS.ORIGIN.join(", ")
            : env.CORS.ORIGIN
        }`
      );
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

// ✅ NEW: Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing server gracefully...");
  try {
    await sequelize.close();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing server gracefully...");
  try {
    await sequelize.close();
    console.log("Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("Error during shutdown:", error);
    process.exit(1);
  }
});

// Start the application
startServer();
