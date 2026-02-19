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
import { Like } from "typeorm";
import { QueryFailedError } from "typeorm";

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
  console.log("\n========================================");
  console.log("🏢 CREATE AGENCY + FIRST AGENT START");
  console.log("========================================");

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
  if (!req.body) {
    console.log("❌ Nessun dato ricevuto nel body");
    return res.status(400).json({ error: "Request body is required" });
  }

  console.log("📋 Dati ricevuti:", {
    name,
    email,
    agencyPhoneNumber,
    firstName,
    lastName,
    agentPhoneNumber,
    hasFile: !!req.file,
  });

  // Validazioni
  if (!name || !email || !agencyPhoneNumber) {
    console.log("❌ Dati mancanti");
    return res
      .status(400)
      .json({ error: "Name, email and agency phone number are required" });
  }
  if (!firstName || !lastName || !agentPhoneNumber) {
    console.log("❌ Dati mancanti per agente");
    return res.status(400).json({
      error: "First name, last name and agent phone number are required",
    });
  }

  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log("✅ Transazione avviata");

    const agencyRepo = queryRunner.manager.getRepository(Agency);
    const agentRepo = queryRunner.manager.getRepository(Agent);
    const logoRepo = queryRunner.manager.getRepository(Logo);

    const existingAgencyByName = await agencyRepo.findOne({
      where: { name: String(name).trim() },
    });
    if (existingAgencyByName) {
      console.log("❌ Agency con questo nome già esiste");
      await queryRunner.rollbackTransaction();
      return res.status(409).json({ message: "Agency name already exists" });
    }

    const existingAgencyByEmail = await agencyRepo.findOne({
      where: { email: String(email).trim().toLowerCase() },
    });
    if (existingAgencyByEmail) {
      console.log("❌ Agency con questa email già esiste");
      await queryRunner.rollbackTransaction();
      return res.status(409).json({ message: "Agency email already exists" });
    }

    console.log("✅ No duplicati trovati");

    // 1) Create Agency
    console.log("📍 Step 1: Creo Agency...");

    const newAgency = Object.assign(new Agency(), {
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      phoneNumber: String(agencyPhoneNumber).trim(),
    });

    const savedAgency = await agencyRepo.save(newAgency);
    console.log("✅ Agency salvata. ID:", savedAgency.id);

    // 2) Create Logo if provided
    if (req.file) {
      console.log("📷 Step 2: Salvo logo...");
      console.log("📷 File info:", {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      const baseUrl = `${req.protocol}://${req.get("host")}`;
      const url = `${baseUrl}/uploads/logos/${req.file.filename}`;
      const format = extToLogoFormat(path.extname(req.file.originalname));

      console.log("📷 URL logo:", url);
      console.log("📷 Format:", format);

      const logo = Object.assign(new Logo(), {
        url,
        format,
        agency: savedAgency,
      });

      const savedLogo = await logoRepo.save(logo);
      console.log("✅ Logo salvato. ID:", savedLogo.id);
    } else {
      console.log("⏭️  Nessun file logo fornito, salto");
    }

    // 3) Username generation (prefix + numero)
    console.log("👤 Step 3: Genero username...");

    const usernameBase = normalizeUsernameBase(firstName, lastName);
    console.log("👤 Username base:", usernameBase);

    // Trova usernames esistenti nell'agenzia che iniziano con usernameBase
    // Esempio: "mario.rossi", "mario.rossi2", "mario.rossi3"
    const existingAgents = await agentRepo.find({
      where: {
        agency: { id: savedAgency.id },
        username: Like(`${usernameBase}%`),
      },
      select: { username: true },
    });

    const existingUsernames = existingAgents.map((a) => a.username);
    console.log("👤 Usernames esistenti:", existingUsernames);

    const usernameFinal = nextUsernameFromExisting(
      usernameBase,
      existingUsernames,
    );
    console.log("✅ Username finale:", usernameFinal);

    // 4) Temporary password
    console.log("🔐 Step 4: Genero password temporanea...");

    const temporaryPassword = generateTemporaryPassword();
    console.log(
      "🔐 Password generata (primemq 5 char):",
      temporaryPassword.substring(0, 5) + "***",
    );

    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);
    console.log("🔐 Password hashata");

    // 5) Create first Agent (admin)
    console.log("👨‍💼 Step 5: Creo primo agente...");

    const newAgent = Object.assign(new Agent(), {
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      phoneNumber: String(agentPhoneNumber).trim(),
      username: usernameFinal,
      isAdmin: true,
      isPasswordChange: false,
      password: hashedPassword,
      agency: savedAgency,
    });

    const savedAgent = await agentRepo.save(newAgent);
    console.log("✅ Agente creato. ID:", savedAgent.id);

    // ✅ Commit
    await queryRunner.commitTransaction();
    console.log("✅ Transazione committed");

    console.log("========================================");
    console.log("✅ AGENCY + AGENTE CREATI CON SUCCESSO");
    console.log("========================================\n");

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
  } catch (error: unknown) {
    console.log("❌ ERRORE durante la creazione:", error);

    try {
      await queryRunner.rollbackTransaction();
      console.log("✅ Transazione rollbacked");
    } catch (rollbackError) {
      console.log("❌ Errore durante rollback:", rollbackError);
    }

    if (req.file) {
      console.log("🗑️  Cancello file uploadati...");
      await deleteUploadedFilesSafe([req.file]);
    }

    console.log("========================================\n");

    // Messaggi safe e utili per debug
    const message = error instanceof Error ? error.message : "Unknown error";

    let pgDetail: string | undefined;
    let pgCode: string | undefined;

    if (error instanceof QueryFailedError) {
      const driverErr = error.driverError as any; // pg driver error
      pgDetail = driverErr?.detail;
      pgCode = driverErr?.code;
    }

    return res.status(500).json({
      error: "Internal server error",
      message,
      pgCode,
      pgDetail,
    });
  } finally {
    await queryRunner.release();
    console.log("✅ Query runner rilasciato");
  }
};
