import { AppDataSource } from "../data-source.js";
import { Agent } from "../entities/agent.js";
export const AgentRepository = AppDataSource.getRepository(Agent);

export const createAgent = (agentData: Partial<Agent>): Agent => {
  return AgentRepository.create(agentData);
};

export const saveAgent = async (agent: Agent): Promise<Agent> => {
  return await AgentRepository.save(agent);
};
export const findAgentById = async (id: number): Promise<Agent | null> => {
  return await AgentRepository.findOne({ where: { id } });
};
export const findAgentsByAgencyIdAndUsername = async (
  agencyId: number,
  username: string,
): Promise<Agent | null> => {
  return await AgentRepository.findOne({
    where: {
      username,
      agency: { id: agencyId },
    },
  });
};
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
