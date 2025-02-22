const nodemailer = require("nodemailer");
require('dotenv').config();

const sendOTP = async (email, otp) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error("Missing email credentials in environment variables");
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465, // Secure SSL
      secure: true, // Use SSL
      auth: {
        user: process.env.EMAIL_USER.trim(),
        pass: process.env.EMAIL_PASS.trim(),
      },
    });

    const mailOptions = {
      from: `"Secure Chat App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your OTP Code",
      text: `Your OTP is ${otp}. It expires in 5 minutes.`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ OTP sent: ", info.response);

    return { success: true, message: "OTP sent successfully!" };
  } catch (error) {
    console.error("❌ Error sending OTP: ", error);
    return { success: false, message: "Failed to send OTP", error: error.message };
  }
};

module.exports = sendOTP;
