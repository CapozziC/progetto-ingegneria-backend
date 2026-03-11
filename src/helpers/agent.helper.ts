import { Like, Repository } from "typeorm";
import { Agent } from "../entities/agent.js";
import { normalizeUsernameBase,nextUsernameFromExisting } from "../utils/username.utils.js";

/**
 * Generates a unique username for the first agent of a newly created agency based on the agent's first name and last name. The function normalizes the base username by combining the first name and last name, and then checks the database for existing usernames that start with the same base. It retrieves all existing usernames for agents in the same agency that match the base pattern and then generates a new username by appending a number to the base if necessary to ensure uniqueness. The generated username is returned as a string.
 * @param agentRepo - TypeORM repository for the Agent entity, used to query the database for existing agents and their usernames
 * @param agencyId - The ID of the agency for which the first agent is being created, used to filter existing agents by agency
 * @param firstName - The first name of the agent, used to create the base for the username
 * @param lastName - The last name of the agent, used to create the base for the username
 * @returns A promise that resolves to a string containing the generated unique username for the first agent
 */
export const generateFirstAgentUsername = async (
  agentRepo: Repository<Agent>,
  agencyId: number,
  firstName: string,
  lastName: string,
): Promise<string> => {
  const usernameBase = normalizeUsernameBase(firstName, lastName);

  const existingAgents = await agentRepo.find({
    where: {
      agency: { id: agencyId },
      username: Like(`${usernameBase}%`),
    },
    select: { username: true },
  });

  const existingUsernames = existingAgents.map((agent) => agent.username);

  return nextUsernameFromExisting(usernameBase, existingUsernames);
};