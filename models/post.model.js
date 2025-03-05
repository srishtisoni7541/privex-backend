const mongoose = require("mongoose");

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Post Owner
    image: { type: String, required: true }, // ✅ Image should be String (URL)
    caption: { type: String, maxlength: 500 }, // Caption
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Liked Users
    likeCount: { type: Number, default: 0 }, // Default like count 0
    comments: [
      {
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Commenter
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Post", postSchema);
