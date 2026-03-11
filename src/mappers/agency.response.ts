import { Agency } from "../entities/agency.js";
import { Agent } from "../entities/agent.js";

/**
 * Builds a response object for the creation of a new agency and its first agent, including the agency details, agent details, and credentials for the first agent. The function takes an object containing the created agency entity, the created agent entity, the generated username for the first agent, and a temporary password. It constructs a response object that includes the agency's ID, name, email, and phone number, as well as the agent's ID, first name, last name, phone number, username, admin status, and associated agency ID. Additionally, it includes a credentials object that contains the username and temporary password for the first agent. This function is intended to be used as a mapper to format the response for the API endpoint that handles the creation of new agencies and their first agents.
 * @param param0 - An object containing the created agency entity, the created agent entity, the generated username for the first agent, and a temporary password. The agency and agent entities are expected to have properties that correspond to their respective fields in the database, while the username and temporary password are strings generated during the creation process.
 * @return An object that includes the details of the created agency and agent, as well as the credentials for the first agent, formatted for the API response.
 */
export const buildCreateAgencyResponse = ({
  agency,
  agent,
  username,
  temporaryPassword,
}: {
  agency: Agency;
  agent: Agent;
  username: string;
  temporaryPassword: string;
}) => {
  return {
    agency: {
      id: agency.id,
      name: agency.name,
      email: agency.email,
      phoneNumber: agency.phoneNumber,
    },
    agent: {
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      phoneNumber: agent.phoneNumber,
      username: agent.username,
      isAdmin: agent.isAdmin,
      agencyId: agency.id,
    },
    credentials: {
      username,
      temporaryPassword,
    },
  };
};