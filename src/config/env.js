const dotenv = require("dotenv");

// Load environment variables from .env file
dotenv.config();

// Environment configuration with validation and defaults
const env = {
  // Server Configuration
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: parseInt(process.env.PORT) || 3000,

  // Database Configuration
  DATABASE: {
    HOST: process.env.DB_HOST || "localhost",
    PORT: parseInt(process.env.DB_PORT) || 5432,
    NAME: process.env.DB_DATABASE || "postgres",
    USER: process.env.DB_USERNAME || "db_user",
    PASSWORD: process.env.DB_PASSWORD || "db_password",
    SSL:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
    SYNC: process.env.DB_SYNC === "true",
    POOL: {
      MAX: parseInt(process.env.DB_POOL_MAX) || 20,
      IDLE_TIMEOUT: parseInt(process.env.DB_IDLE_TIMEOUT) || 30000,
      CONNECTION_TIMEOUT: parseInt(process.env.DB_CONNECTION_TIMEOUT) || 5000, // ✅ Tăng timeout
    },
  },
  DATETIME: {
    TODAY: process.env.TODAY,
  },
  JWT: {
    SECRET: process.env.JWT_SECRET || "your-default-secret-key",
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  },

  // ✅ FIX: CORS Configuration
  CORS: {
    // ❌ BỎ dấu "/" ở cuối URL
    // ✅ Hỗ trợ nhiều origins (production + development)
    ORIGIN: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.split(",").map((url) => url.trim())
      : ["http://localhost:5173", "http://localhost:3000"],
    CREDENTIALS: true,
    METHODS: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    ALLOWED_HEADERS: ["Content-Type", "Authorization"],
  },

  // Security Configuration
  BCRYPT: {
    ROUNDS: parseInt(process.env.BCRYPT_ROUNDS) || 12,
  },

  PAYOS: {
    CLIENT_ID: process.env.PAYOS_CLIENT_ID,
    API_KEY: process.env.PAYOS_API_KEY,
    CHECKSUM_KEY: process.env.PAYOS_CHECKSUM_KEY,
  },

  // ✅ THÊM: Upload configuration
  UPLOAD: {
    DIR: process.env.UPLOAD_DIR || "./uploads",
    MAX_SIZE: parseInt(process.env.UPLOAD_MAX_SIZE) || 5 * 1024 * 1024, // 5MB
  },

  // ✅ THÊM: Cloudinary (nếu dùng)
  CLOUDINARY: {
    CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    API_KEY: process.env.CLOUDINARY_API_KEY,
    API_SECRET: process.env.CLOUDINARY_API_SECRET,
  },
};

// Validation function to check required environment variables
const validateEnv = () => {
  const required = [];
  const warnings = [];

  // Check database connection
  if (!env.DATABASE.HOST) {
    required.push("DB_HOST");
  }

  // Check JWT secret
  if (!env.JWT.SECRET || env.JWT.SECRET === "your-default-secret-key") {
    if (env.NODE_ENV === "production") {
      required.push("JWT_SECRET");
    } else {
      warnings.push("JWT_SECRET (using default for development)");
    }
  }

  // Check PayOS credentials in production
  if (env.NODE_ENV === "production") {
    if (!env.PAYOS.CLIENT_ID) warnings.push("PAYOS_CLIENT_ID");
    if (!env.PAYOS.API_KEY) warnings.push("PAYOS_API_KEY");
    if (!env.PAYOS.CHECKSUM_KEY) warnings.push("PAYOS_CHECKSUM_KEY");

    if (!env.CLOUDINARY.CLOUD_NAME)
      warnings.push("CLOUDINARY_CLOUD_NAME (for file uploads)");
  }

  // Show warnings
  if (warnings.length > 0) {
    console.warn("⚠️  Warnings - Missing optional variables:");
    warnings.forEach((w) => console.warn(`   - ${w}`));
  }

  // Check required
  if (required.length > 0) {
    console.error("❌ Missing required environment variables:");
    required.forEach((r) => console.error(`   - ${r}`));
    console.error(
      "💡 Please check your .env file or Render environment variables"
    );
    process.exit(1);
  }

  // Success message
  console.log("✅ Environment variables loaded successfully");
  console.log(`📦 Environment: ${env.NODE_ENV}`);
  console.log(
    `🌐 CORS Origins: ${
      Array.isArray(env.CORS.ORIGIN)
        ? env.CORS.ORIGIN.join(", ")
        : env.CORS.ORIGIN
    }`
  );
};

// Utility function to check if running in development
const isDevelopment = () => env.NODE_ENV === "development";

// Utility function to check if running in production
const isProduction = () => env.NODE_ENV === "production";

module.exports = {
  env,
  validateEnv,
  isDevelopment,
  isProduction,
};
