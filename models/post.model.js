const mongoose = require("mongoose");

const postSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }, // Post Owner
  image: { type: Buffer, required: true }, // Post Image URL
  caption: { type: String, maxlength: 500 }, // Caption
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], // Liked Users
  likeCount:{type:Number},
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Commenter
      text: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
    },
  ],
}, { timestamps: true });

module.exports = mongoose.model("Post", postSchema);
