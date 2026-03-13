import { transporter } from "../../config/nodemailer.config.js";
import {SendMailParams} from "../../types/email.type.js";

export async function sendEmail({
  to,
  subject,
  html,
  text,
}: SendMailParams) {
  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject,
    html,
    text,
  });
}