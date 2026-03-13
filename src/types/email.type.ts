/**
 * Type definition for sending emails
 */
export type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};
/**
 * Type definition for the parameters required to send an email using the create new agent agent template
 */
export type NewAgentTemplateParams = {
  firstName: string;
  username: string;
  temporaryPassword: string;
  loginUrl: string;
};
/**
 * Type definition for the parameters required to send an email using the user forgot password template
 */
export type AccountForgotPasswordTemplateParams = {
  firstName: string;
  resetUrl: string;
};

/**
 * Type definition for the parameters required to send an email using the agent forgot password template
 */
export type AgentForgotPasswordTemplateParams = {
  username: string;
  resetUrl: string;
};
/**
 * Type definition for the parameters required to send  an email using the creation agency template
 */
export type AgencyCreatedTemplateParams = {
  agencyName: string;
  agencyEmail: string;
  agentUsername: string;
  temporaryPassword: string;
  loginUrl: string;
};
