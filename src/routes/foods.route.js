const express = require("express");
const multer = require("multer");
const FoodController = require("../controllers/foods");
const { env } = require("../config/env");
const router = express.Router();

// ✅ Chọn storage dựa trên environment
let storage;
let useCloudinary = false;

if (env.NODE_ENV === "production" && env.CLOUDINARY.CLOUD_NAME) {
  // ✅ PRODUCTION: Dùng Cloudinary
  try {
    const { storage: cloudinaryStorage } = require("../config/cloudinary");
    storage = cloudinaryStorage;
    useCloudinary = true;
    console.log("✅ Using Cloudinary storage for file uploads");
  } catch (error) {
    console.error("❌ Cloudinary config error:", error.message);
    console.error(
      "⚠️  Falling back to local storage (NOT recommended for production)"
    );
  }
}

if (!storage) {
  // ✅ DEVELOPMENT: Dùng local storage
  const path = require("path");
  const fs = require("fs");

  const uploadDir = path.join(__dirname, "../uploads/foods");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, "food-" + uniqueSuffix + ext);
    },
  });

  console.log("⚠️  Using local storage for file uploads");
}

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP)"), false);
  }
};

// Multer config
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

// Middleware xử lý lỗi upload
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "File quá lớn. Kích thước tối đa là 5MB",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Lỗi upload: ${err.message}`,
    });
  } else if (err) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }
  next();
};

// ✅ Middleware để attach storage type vào request
const attachStorageInfo = (req, res, next) => {
  req.useCloudinary = useCloudinary;
  next();
};

// Routes - Thứ tự quan trọng: cụ thể trước, chung sau

// Search foods (phải đặt trước /:id)
router.get("/search", FoodController.searchFoods);

// Get foods by category (phải đặt trước /:id)
router.get("/category/:category", FoodController.getFoodsByCategory);

// Get all foods with pagination
router.get("/", FoodController.getAllFoods);

// Get food by ID
router.get("/:id", FoodController.getFoodById);

// Create new food (WITH IMAGE UPLOAD)
router.post(
  "/",
  upload.single("image"),
  handleUploadError,
  attachStorageInfo,
  FoodController.createFood
);

// Update food (WITH IMAGE UPLOAD)
router.put(
  "/:id",
  upload.single("image"),
  handleUploadError,
  attachStorageInfo,
  FoodController.updateFood
);

// Update food quantity
router.patch("/:id/quantity", FoodController.updateQuantity);

// Delete food
router.delete("/:id", FoodController.deleteFood);

module.exports = router;
