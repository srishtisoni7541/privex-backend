const multer = require("multer");

// ✅ Memory Storage (Image directly DB me store karne ke liye)
const storage = multer.memoryStorage(); 

const upload = multer({ storage });

module.exports = upload;
