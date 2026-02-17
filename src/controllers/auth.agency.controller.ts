import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source.js";
import { Agency } from "../entities/agency.js";
import { Agent } from "../entities/agent.js";
import { Logo, Format } from "../entities/logo.js";
import path from "path";
import { generateTemporaryPassword } from "../utils/password.utils.js";
import {
  normalizeUsernameBase,
  nextUsernameFromExisting,
} from "../utils/username.utils.js";
import { deleteUploadedFilesSafe } from "./upload.controller.js";

/**
 * Convert a file extension to the corresponding Format enum value for the agency logo.
 * This function takes a file extension as input, normalizes it by removing the leading dot and converting it to uppercase,
 * and then maps it to the appropriate Format enum value. If the extension does not match any known formats, it defaults to Format.JPG.
 * @param ext The file extension of the uploaded logo file (e.g., ".jpg", ".png")
 * @returns The corresponding Format enum value for the agency logo
 */
const extToLogoFormat = (ext: string): Format => {
  const e = ext.replace(".", "").toUpperCase();
  if (e === "JPG") return Format.JPG;
  if (e === "JPEG") return Format.JPEG;
  if (e === "PNG") return Format.PNG;
  if (e === "HEIC") return Format.HEIC;
  return Format.JPG;
};

/**
 * Create a new agency with its first agent (administrator) in a single transaction.
 * The first agent's username is generated based on their first name and last name, and a temporary password is created.
 * Both the agency and the agent are saved to the database.
 * If any error occurs during the process, the transaction is rolled back and an appropriate error response is sent.
 * @param req Request with body containing the necessary information to create the agency and the first agent, and optionally a file for the agency logo. The expected body parameters are:
 * @param res Response with the created agency and agent details, including the generated credentials for the agent, or an error message if the creation fails. The response includes:
 * @returns JSON with the created agency and agent details, including the generated credentials for the agent, or an error message if the creation fails.
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

  // Validazioni
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
    const logoRepo = queryRunner.manager.getRepository(Logo);

    // Duplicati Agency (dentro transazione)
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

    if (req.file) {
      const baseUrl = `${req.protocol}://${req.get("host")}`;

      // se salvi in sottocartella /logos -> url = `${baseUrl}/uploads/logos/${req.file.filename}`
      // se salvi tutto in /uploads -> url = `${baseUrl}/uploads/${req.file.filename}`
      const url = `${baseUrl}/uploads/logos/${req.file.filename}`;

      const format = extToLogoFormat(path.extname(req.file.originalname));

      const logo = logoRepo.create({
        url,
        format,
        agency: savedAgency,
      });

      await logoRepo.save(logo);
    }

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

    if (req.file) {
      await deleteUploadedFilesSafe([req.file]);
    }

    return res.status(500).json({
      error: "Internal server error",
    });
  } finally {
    await queryRunner.release();
  }
};
