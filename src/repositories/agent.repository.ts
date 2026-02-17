import { AppDataSource } from "../data-source.js";
import { Agent } from "../entities/agent.js";
export const AgentRepository = AppDataSource.getRepository(Agent);

function withAgency(agencyId: number) {
  return { agency: { id: agencyId } };
}

/**
 * Create a new agent instance with the provided data. This function takes a partial agent object containing the necessary fields for agent creation and returns a new Agent instance that can be saved to the database.
 * @param agentData A partial object containing the necessary fields for creating a new agent
 * @returns A new Agent instance created from the provided data
 */
export const createAgent = (agentData: Partial<Agent>): Agent => {
  return AgentRepository.create(agentData);
};

/**
 * Save an agent to the database. This function takes an Agent object and saves it to the database using the AgentRepository. It returns a Promise that resolves to the saved Agent object, which may include additional fields such as the generated ID.
 * @param agent The Agent object to save to the database
 * @returns A Promise that resolves to the saved Agent object
 */

export const saveAgent = async (agent: Agent): Promise<Agent> => {
  return await AgentRepository.save(agent);
};

/**
 * Find an agent by their username within a specific agency. This function queries the database for an agent with the specified username and agency ID, and returns it if found. If no agent is found with the given criteria, it returns null.
 * @param agencyId The unique identifier of the agency to which the agent belongs
 * @param username The username of the agent to find
 * @returns A Promise that resolves to the Agent object if found, or null if not found
 */
export const findAgentsByAgencyIdAndUsername = async (
  agencyId: number,
  username: string,
): Promise<Agent | null> => {
  return AgentRepository.findOne({
    where: {
      username,
      ...withAgency(agencyId),
    },
  });
};
/**
 * Find agents by their username prefix within a specific agency. This function queries the database for agents whose usernames start with the specified prefix and belong to the given agency ID, and returns an array of matching Agent objects. If no agents are found with the given criteria, it returns an empty array.
 * @param agencyId The unique identifier of the agency to which the agents belong
 * @param prefix The username prefix to search for
 * @returns A Promise that resolves to an array of Agent objects that match the criteria, or an empty array if no matches are found
 */
export const findAgentsByAgencyAndUsernamePrefix = async (
  agencyId: number,
  prefix: string,
): Promise<Agent[]> => {
  return await AgentRepository.createQueryBuilder("agent")
    .innerJoin("agent.agency", "agency")
    .where("agency.id = :agencyId", { agencyId })
    .andWhere("agent.username LIKE :prefix", { prefix: `${prefix}%` })
    .getMany();
};

/**
 *  Delete an agent by their unique identifier (ID). This function takes the ID of the agent to be deleted and removes the corresponding record from the database. It returns a Promise that resolves when the deletion is complete.
 * @param id The unique identifier of the agent to delete
 * @returns A Promise that resolves when the deletion is complete
 */
export const deleteAgentById = async (id: number): Promise<void> => {
  await AgentRepository.delete({ id });
};

/**
 *  Find an agent by their unique identifier (ID). This function queries the database for an agent with the specified ID and returns it if found. If no agent is found with the given ID, it returns null.
 * @param id The unique identifier of the agent to find
 * @returns A Promise that resolves to the Agent object if found, or null if not found
 */
export const findAgentById = async (id: number): Promise<Agent | null> => {
  return AgentRepository.findOne({ where: { id } });
};
/**
 *  Find an agent created by a specific admin within a specific agency. This function queries the database for an agent with the specified agent ID, agency ID, and administrator ID, and returns it if found. If no agent is found with the given criteria, it returns null.
 *  @param agentId The unique identifier of the agent to find
 * @param agencyId The unique identifier of the agency to which the agent belongs
 * @param administratorId The unique identifier of the administrator who created the agent
 * @returns A Promise that resolves to the Agent object if found, or null if not found
 */

export const findAgentCreatedByAdmin = async (
  agentId: number,
  agencyId: number,
  administratorId: number,
): Promise<Agent | null> => {
  return AgentRepository.findOne({
    where: {
      id: agentId,
      ...withAgency(agencyId),
      administrator: { id: administratorId },
    },
  });
};

/**
 *  Update the phone number of an agent. This function takes the unique identifier of the agent and the new phone number, and updates the corresponding record in the database with the new phone number. It returns a Promise that resolves when the update is complete.
 * @param agentId The unique identifier of the agent whose phone number is to be updated
 * @param phoneNumber The new phone number to set for the agent
 * @returns A Promise that resolves when the update is complete
 */
export const updateAgentPhoneNumber = async (
  agentId: number,
  phoneNumber: string,
): Promise<void> => {
  await AgentRepository.update({ id: agentId }, { phoneNumber });
};

/**
 * Find an agent by their unique identifier (ID) for authentication purposes. This function queries the database for an agent with the specified ID and retrieves it along with its related agency and administrator entities. If no agent is found with the given ID, it returns null.
 * @param id The unique identifier of the agent to find
 * @returns A Promise that resolves to the Agent object with its related entities if found, or null if not found
 */
export const findAgentAuthById = async (id: number): Promise<Agent | null> => {
  return AgentRepository.findOne({
    where: { id },
    relations: {
      agency: true,
      administrator: true, // opzionale
    },
  });
};
