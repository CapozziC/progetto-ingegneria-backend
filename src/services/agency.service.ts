import { Repository } from "typeorm";
import { Agency } from "../entities/agency.js";
import { Agent } from "../entities/agent.js";
import { CreateAgencyPayload } from "../types/agency.type.js";
import { AppDataSource } from "../data-source.js";


/**
 * Utility functions for creating agency and agent entities in the database. This module provides functions to create new agency entities and their associated first agent entities based on the provided payload. The createAgencyEntity function takes a TypeORM repository for the Agency entity and a CreateAgencyPayload object, constructs a new Agency entity, and saves it to the database. The createFirstAgentEntity function takes a TypeORM repository for the Agent entity and an object containing the necessary parameters to create a new Agent entity (including the associated agency, agent details, username, and hashed password), constructs the Agent entity, and saves it to the database. These utility functions are intended to be used in the process of creating new agencies and their first agents in the application.
 * @module agencyEntityUtils
 * @requires typeorm
 * @requires ../entities/agency.js
 * @requires ../entities/agent.js
 * @requires ../types/agency.type.js
 */
export const createFirstAgentEntity = async (
  agentRepo: Repository<Agent>,
  params: {
    agency: Agency;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    username: string;
    hashedPassword: string;
  },
): Promise<Agent> => {
  const newAgent = Object.assign(new Agent(), {
    firstName: params.firstName,
    lastName: params.lastName,
    phoneNumber: params.phoneNumber,
    username: params.username,
    isAdmin: true,
    isPasswordChange: false,
    password: params.hashedPassword,
    agency: params.agency,
  });

  return agentRepo.save(newAgent);
};

/**
 * Creates a new agency entity in the database based on the provided payload. The function takes a TypeORM repository for the Agency entity and a CreateAgencyPayload object containing the necessary information to create a new agency (name, email, and phone number). It constructs a new Agency entity using the provided information and saves it to the database. The created Agency entity is returned as a promise after it has been saved. This function is intended to be used as a helper to create new agency entities in the application when processing requests to create new agencies.
 * @param agencyRepo - TypeORM repository for the Agency entity, used to save the new agency in the database
 * @param payload - An object containing the necessary information to create a new agency, including the name, email, and phone number of the agency
 * @returns A promise that resolves to the created Agency entity after it has been saved in the database
 */
export const createAgencyEntity = async (
  agencyRepo: Repository<Agency>,
  payload: CreateAgencyPayload,
): Promise<Agency> => {
  const newAgency = Object.assign(new Agency(), {
    name: payload.name,
    email: payload.email,
    phoneNumber: payload.agencyPhoneNumber,
  });

  return agencyRepo.save(newAgency);
};

/**
 *  Deletes an agency and its founder agent in a single transaction. The function takes the ID of the agent to delete, which is expected to be the founder of the agency. It performs a series of checks to ensure that the agent exists, is an admin (founder), and that there are no other agents associated with the agency before proceeding with the deletion. If all checks pass, it removes both the agent and the associated agency from the database within a transaction to ensure data integrity. If any of the checks fail, it throws an appropriate error message indicating the reason for the failure.
 * @param agentIdToDelete - The ID of the agent to delete, which is expected to be the founder of the agency. This ID is used to identify both the agent and the associated agency for deletion.
 * @returns A promise that resolves when the deletion is complete. If the agent or agency is not found, if the agent is not an admin, or if there are other agents associated with the agency, the promise will be rejected with an error message indicating the reason for the failure.
 */
export const deleteFounderAndAgencyTransaction = async (agentIdToDelete: number) => {
  await AppDataSource.transaction(async (manager) => {
    const agentRepo = manager.getRepository(Agent);
    const agencyRepo = manager.getRepository(Agency);

    const agent = await agentRepo.findOne({
      where: { id: agentIdToDelete },
      relations: ["agency"],
    });

    if (!agent) {
      throw new Error("AGENT_NOT_FOUND");
    }

    const agency = agent.agency;
    if (!agency) {
      throw new Error("AGENCY_NOT_FOUND");
    }

    if (!agent.isAdmin) {
      throw new Error("NOT_FOUNDER");
    }

    const otherAgentsCount = await agentRepo.count({
      where: {
        agency: agency,
      },
    });

    if (otherAgentsCount > 1) {
      throw new Error("AGENCY_HAS_OTHER_AGENTS");
    }

    await agentRepo.remove(agent);
    await agencyRepo.remove(agency);
  });
};