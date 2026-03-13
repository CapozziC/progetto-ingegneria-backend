import { sendEmail } from "./nodemailer.service.js";
import { agentForgotPasswordTemplate } from '../../template/agentForgotPassword.template.js';

export async function sendAgentForgotPasswordEmail(params: {
  to: string;
  username: string;
  token: string;
}) {
  const resetUrl = `${process.env.FRONTEND_URL}/agent/reset-password?token=${params.token}`;
  const emailContent = agentForgotPasswordTemplate({
    username: params.username,
    resetUrl,
  });

  await sendEmail({
    to: params.to,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
}