import { NewAgentTemplateParams } from "../types/email.type.js";

export function newAgentCreationTemplate({
username, 
  temporaryPassword,
  loginUrl,
}: NewAgentTemplateParams) {
  return {
    subject: "Benvenuto in DietiEstates25 - Accesso al tuo account",
    html: `
      <p>Ciao ${username},</p>
      <p>Benvenuto in DietiEstates25! Siamo entusiasti di averti a bordo come nostro nuovo agente.</p>
      <p>Per accedere al tuo account, utilizza le seguenti credenziali:</p>
      <ul>
        <li><strong>Username:</strong> ${username}</li>
        <li><strong>Password Temporanea:</strong> ${temporaryPassword}</li>
      </ul>
      <p> Per garantire la sicurezza del tuo account devi camabiare la password temporanea al primo accesso.</p>
      <p>Puoi accedere al tuo account cliccando sul seguente link: <a href="${loginUrl}">Accedi al tuo account</a></p>
      <p>Se hai domande o hai bisogno di assistenza, non esitare a contattarci.</p>
      <p>Ancora una volta, benvenuto in DietiEstates25!</p>
      <p>Cordiali saluti,<br>DietiEstates25</p>
    `,
    text: `Ciao ${username},

Benvenuto in DietiEstates25! Siamo entusiasti di averti a bordo come nostro nuovo agente.

Per accedere al tuo account, utilizza le seguenti credenziali:
- username: ${username}
- Password Temporanea: ${temporaryPassword}

Per garantire la sicurezza del tuo account devi camabiare la password temporanea al primo accesso.

Puoi accedere al tuo account cliccando sul seguente link: ${loginUrl}

Se hai domande o hai bisogno di assistenza, non esitare a contattarci.

Ancora una volta, benvenuto in DietiEstates25!

Cordiali saluti,
DietiEstates25
`,
  };
}
