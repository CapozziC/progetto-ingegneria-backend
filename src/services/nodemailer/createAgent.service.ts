import { newAgentCreationTemplate } from "../../template/createAgent.template.js";
import { sendEmail } from "./nodemailer.service.js";

export async function sendAgentCreatedEmail(params: {
  to: string;
  firstName: string;
  username: string;
  temporaryPassword: string;
}) {
  const loginUrl = process.env.FRONTEND_URL_LOGIN;
  if (!loginUrl) {
    throw new Error(
      "FRONTEND_URL_LOGIN is not defined in environment variables",
    );
  }
  const emailContent = newAgentCreationTemplate({
    firstName: params.firstName,
    username: params.username,
    temporaryPassword: params.temporaryPassword,
    loginUrl,
  });

  await sendEmail({
    to: params.to,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
}
