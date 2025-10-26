const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const { env } = require("./env");

cloudinary.config({
  cloud_name: env.CLOUDINARY.CLOUD_NAME,
  api_key: env.CLOUDINARY.API_KEY,
  api_secret: env.CLOUDINARY.API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "food-images",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [{ width: 800, height: 800, crop: "limit" }],
  },
});

module.exports = { cloudinary, storage };
