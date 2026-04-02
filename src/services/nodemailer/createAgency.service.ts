import { sendEmail } from "./nodemailer.service.js";
import { newAgencyCreationTemplate } from "../../template/createAgency.template.js";
export async function sendAgencyCreatedEmail(params: {
  to: string;
  agencyName: string;
  agencyEmail: string;
  agentUsername: string;
  temporaryPassword: string;
}) {
  const loginUrl = process.env.FRONTED_URL_LOGIN;
  if (!loginUrl) {
    throw new Error(
      "FRONTEND_URL_AGENCY_REGISTER is not defined in environment variables",
    );
  }
  const emailContent = newAgencyCreationTemplate({
    agencyName: params.agencyName,
    agencyEmail: params.agencyEmail,
    agentUsername: params.agentUsername,
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
