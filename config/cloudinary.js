const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

// 🔥 Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUD_NAME || "your_cloud_name",
  api_key: process.env.CLOUD_API_KEY || "your_api_key",
  api_secret: process.env.CLOUD_API_SECRET || "your_api_secret",
});

const storage = new CloudinaryStorage({
    cloudinary,
    params: {
      folder: "post_images",
      format: async (req, file) => "png", // Default PNG rakho
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
      resource_type: "image",
    },
  });
  

// 🔥 Multer middleware for file upload
const upload = multer({ storage });

module.exports = { cloudinary, upload };
