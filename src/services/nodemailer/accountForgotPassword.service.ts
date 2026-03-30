import { sendEmail } from "./nodemailer.service.js";
import { accountForgotPasswordTemplate } from "../../template/accountForgotPassword.template.js";
export async function sendAccountForgotPasswordEmail(params: {
  to: string;
  firstName: string;
  token: string;
}) {
  const resetUrl = `${process.env.FRONTEND_URL_RESET_PASSWORD_ACCOUNT}token=${params.token}`;
  const emailContent = accountForgotPasswordTemplate({
    firstName: params.firstName,
    resetUrl,
  });

  await sendEmail({
    to: params.to,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text,
  });
}
