import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source.js";
import { Agency } from "../entities/agency.js";
import { Agent } from "../entities/agent.js";
import { generateTemporaryPassword } from "../utils/password.utils.js";
import {
  normalizeUsernameBase,
  nextUsernameFromExisting,
} from "../utils/username.utils.js";

/**
 * Create a new agency with its first agent (administrator) in a single transaction. The first agent's username is generated based on their first name and last name, and a temporary password is created. Both the agency and the agent are saved to the database. If any error occurs during the process, the transaction is rolled back and an appropriate error response is sent.
 * @param req
 * @param res
 * @returns
 */
export const createNewAgencyWithFirstAgent = async (
  req: Request,
  res: Response,
) => {
  const {
    // Agency
    name,
    email,
    agencyPhoneNumber,

    // Agent
    firstName,
    lastName,
    agentPhoneNumber,
  } = req.body;

  // ✅ Validazioni
  if (!name) return res.status(400).json({ error: "Name is required" });
  if (!email) return res.status(400).json({ error: "Email is required" });
  if (!agencyPhoneNumber)
    return res.status(400).json({ error: "Agency phone number is required" });

  if (!firstName)
    return res.status(400).json({ error: "First name is required" });
  if (!lastName)
    return res.status(400).json({ error: "Last name is required" });
  if (!agentPhoneNumber)
    return res.status(400).json({ error: "Agent phone number is required" });

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const agencyRepo = queryRunner.manager.getRepository(Agency);
    const agentRepo = queryRunner.manager.getRepository(Agent);

    // ✅ Duplicati Agency (dentro transazione)
    const existingAgencyByName = await agencyRepo.findOne({
      where: { name: String(name).trim() },
    });
    if (existingAgencyByName) {
      return res.status(409).json({ message: "Agency name already exists" });
    }

    const existingAgencyByEmail = await agencyRepo.findOne({
      where: { email: String(email).trim().toLowerCase() },
    });
    if (existingAgencyByEmail) {
      return res.status(409).json({ message: "Agency email already exists" });
    }

    // 1) Create Agency
    const newAgency = agencyRepo.create({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phoneNumber: String(agencyPhoneNumber).trim(),
    });

    const savedAgency = await agencyRepo.save(newAgency);

    // 2) Username generation (prefix + numero)
    const usernameBase = normalizeUsernameBase(firstName, lastName);

    // Trova usernames esistenti nell'agenzia che iniziano con usernameBase
    // Esempio: "mario.rossi", "mario.rossi2", "mario.rossi3"
    const existingAgents = await agentRepo
      .createQueryBuilder("a")
      .select(["a.username"])
      .where(`"a"."agency_id" = :agencyId`, { agencyId: savedAgency.id })
      .andWhere("a.username LIKE :prefix", { prefix: `${usernameBase}%` })
      .getMany();

    const existingUsernames = existingAgents.map((a) => a.username);
    const usernameFinal = nextUsernameFromExisting(
      usernameBase,
      existingUsernames,
    );

    // 3) Temporary password
    const temporaryPassword = generateTemporaryPassword();
    //Logica per invio credenziali per email
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // 4) Create first Agent (admin)
    const newAgent = agentRepo.create({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phoneNumber: String(agentPhoneNumber).trim(),
      username: usernameFinal,
      isAdmin: true,
      isPasswordChange: false,
      password: hashedPassword,
      administrator: undefined,
    });

    newAgent.agency = savedAgency;

    const savedAgent = await agentRepo.save(newAgent);

    // ✅ Commit
    await queryRunner.commitTransaction();

    // ✅ Response (NO password hash)
    // Ti ritorno anche la temporaryPassword così la vedi in dev.
    // In prod: NON inviarla, inviala via email.
    return res.status(201).json({
      agency: {
        id: savedAgency.id,
        name: savedAgency.name,
        email: savedAgency.email,
        phoneNumber: savedAgency.phoneNumber,
      },
      agent: {
        id: savedAgent.id,
        firstName: savedAgent.firstName,
        lastName: savedAgent.lastName,
        phoneNumber: savedAgent.phoneNumber,
        username: savedAgent.username,
        isAdmin: savedAgent.isAdmin,
        agencyId: savedAgency.id,
      },
      credentials: {
        username: usernameFinal,
        temporaryPassword, // ⚠️ solo per dev/test
      },
    });
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error("Error creating agency + first agent:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  } finally {
    await queryRunner.release();
  }
};
