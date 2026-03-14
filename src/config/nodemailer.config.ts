import dotenv from "dotenv";
dotenv.config();
import nodemailer from "nodemailer";
console.log("Configuring nodemailer with:", {
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  user: process.env.EMAIL_USER,
  password: process.env.EMAIL_PASSWORD,
});

export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: true, // usa STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

transporter
  .verify()
  .then(() => console.log("SMTP ok"))
  .catch((err) => console.error("SMTP non disponibile:", err));
