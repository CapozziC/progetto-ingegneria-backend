import { AgencyCreatedTemplateParams } from "../types/email.type.js";

export function newAgencyCreationTemplate({
  agencyName,
  agencyEmail,
  agentUsername,
  temporaryPassword,
  loginUrl,
}: AgencyCreatedTemplateParams) {
  return {
    subject: "Benvenuto in DietiEstates25",
    html: `
        <h2>Benvenuta ${agencyName},</h2>

        <p>Il tuo account è stato creato con successo su DietiEstates25.</p>

        <p><strong>Dettagli dell'agenzia:</strong></p>
        <ul>
          <li><strong>Nome dell'agenzia:</strong> ${agencyName}</li>
          <li><strong>Email dell'agenzia:</strong> ${agencyEmail}</li>
        </ul>

        <p><strong>Dettagli dell'agente:</strong></p>
        <ul>
          <li><strong>Username dell'agente:</strong> ${agentUsername}</li>
        </ul>

        <p>Puoi accedere utilizzando queste credenziali:</p>
        <ul>
          <li>Username: ${agentUsername}</li>
          <li>Password temporanea: ${temporaryPassword}</li>
        </ul>

        <p>
        Per garantire la sicurezza del tuo account ti consigliamo di cambiare
        la password temporanea al primo accesso.
        </p>

        <p>
        <a href="${loginUrl}">Accedi al tuo account</a>
        </p>

        <p>Cordiali saluti,<br>DietiEstates25</p>
    `,
    text: `
Benvenuta ${agencyName},

Il tuo account è stato creato su DietiEstates25.

Credenziali:
Username: ${agentUsername}
Password temporanea: ${temporaryPassword}

Accedi qui:
${loginUrl}

Cordiali saluti
DietiEstates25
`,
  };
}
