import { Agent } from "../entities/agent.js";

export const mapAgentToResponse = (agent: Agent) => {
  return {
    id: agent.id,
    firstName: agent.firstName,
    lastName: agent.lastName,
    username: agent.username,
    password: !!agent.password,
    createdAt: agent.createdAt,
    isPasswordChange: agent.isPasswordChange,
    updatedAt: agent.updatedAt,
    administratorId: agent.administrator?.id || null,
  };
};
