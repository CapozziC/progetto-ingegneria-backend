import { AppDataSource } from "../data-source.js";
import { Agent } from "../entities/agent.js";
export const AgentRepository = AppDataSource.getRepository(Agent);

export const createAgent = (agentData: Partial<Agent>): Agent => {
  return AgentRepository.create(agentData);
};

export const saveAgent = async (agent: Agent): Promise<Agent> => {
  return await AgentRepository.save(agent);
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

export const deleteAgentById = async (id: number): Promise<void> => {
  await AgentRepository.delete({ id });
};

export const findAgentById = async (id: number): Promise<Agent | null> => {
  return AppDataSource.getRepository(Agent).findOne({ where: { id } });
};

export const findAgentCreatedByAdmin = async (
  agentId: number,
  agencyId: number,
  administratorId: number,
): Promise<Agent | null> => {
  return await AgentRepository.findOne({
    where: {
      id: agentId,
      agency: { id: agencyId },
      administrator: { id: administratorId },
    },
  });
};

export const updateAgentPhoneNumber = async (
  agentId: number,
  phoneNumber: string,
): Promise<void> => {
  await AgentRepository.update({ id: agentId }, { phoneNumber });
};

export const findAgentAuthById = async (id: number): Promise<Agent | null> => {
  return await AgentRepository.findOne({
    where: { id },
    relations: {
      agency: true,
      administrator: true, // opzionale
    },
  });
};
