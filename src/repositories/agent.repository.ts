import { AppDataSource } from "../data-source.js";
import { Agent } from "../entities/agent.js";
export const AgentRepository = AppDataSource.getRepository(Agent);

export const findAgentByUsername = async (
  username: string,
): Promise<Agent | null> => {
  return await AgentRepository.findOne({ where: { username } });
};
export const createAgent = (agentData: Partial<Agent>): Agent => {
  return AgentRepository.create(agentData);
};

export const saveAgent = async (agent: Agent): Promise<Agent> => {
  return await AgentRepository.save(agent);
};
export const findAgentById = async (id: number): Promise<Agent | null> => {
  return await AgentRepository.findOne({ where: { id } });
};
