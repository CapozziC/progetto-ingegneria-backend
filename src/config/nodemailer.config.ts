import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true, // usa STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export const verifySmtpConnection = async () => {
  try {
    await transporter.verify();
    console.log("SMTP ok");
  } catch (err) {
    console.error("SMTP non disponibile:", err);
  }
};
