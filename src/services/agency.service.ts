import { IsNull, Repository } from "typeorm";
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
 * Deletes the founder agent and the agency in a single transaction.
 * The founder is the agent with administrator = null.
 * The agency can be deleted only if no other agents belong to it.
 */
export const deleteFounderAndAgencyTransaction = async (
  agencyIdToDelete: number,
): Promise<void> => {
  await AppDataSource.transaction(async (manager) => {
    const agentRepo = manager.getRepository(Agent);
    const agencyRepo = manager.getRepository(Agency);

    const founder = await agentRepo.findOne({
      where: {
        agency: { id: agencyIdToDelete },
        administrator: IsNull(),
      },
      relations: ["agency"],
    });

    if (!founder) {
      throw new Error("FOUNDER_NOT_FOUND");
    }

    if (!founder.isAdmin) {
      throw new Error("FOUNDER_IS_NOT_ADMIN");
    }

    const agency = founder.agency;
    if (!agency) {
      throw new Error("AGENCY_NOT_FOUND");
    }

    const agentsCount = await agentRepo.count({
      where: {
        agency: { id: agencyIdToDelete },
      },
    });

    if (agentsCount > 1) {
      throw new Error("AGENCY_HAS_OTHER_AGENTS");
    }

    await agentRepo.remove(founder);
    await agencyRepo.remove(agency);
  });
};
