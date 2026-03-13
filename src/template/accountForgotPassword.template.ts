import { AccountForgotPasswordTemplateParams} from "../types/email.type.js";
;

export function accountForgotPasswordTemplate({
  firstName,
  resetUrl,
}: AccountForgotPasswordTemplateParams) {
  return {
    subject: "Recupero Password - DietiEstates25",
    html: `
      <p>Ciao ${firstName},</p>
      <p>Abbiamo ricevuto una richiesta di recupero password per il tuo account DietiEstates25.</p>
      <p>Per reimpostare la tua password, clicca sul seguente link:</p>
      <p><a href="${resetUrl}">Reimposta la tua password</a></p>
      <p>Se non hai richiesto il recupero della password, ignora questa email.</p>
      <p>Grazie,<br>DietiEstates25</p>
    `,
    text: `Ciao ${firstName},

Abbiamo ricevuto una richiesta di recupero password per il tuo account DietiEstates25.

Per reimpostare la tua password, clicca sul seguente link: ${resetUrl}

Se non hai richiesto il recupero della password, ignora questa email.

Grazie,
DietiEstates25
`,
  };
}