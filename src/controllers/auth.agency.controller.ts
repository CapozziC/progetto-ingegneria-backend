import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { AppDataSource } from "../data-source.js";
import { Agency } from "../entities/agency.js";
import { Agent } from "../entities/agent.js";
import { Logo } from "../entities/logo.js";
import { generateTemporaryPassword } from "../utils/password.utils.js";
import { deleteUploadedFilesSafe } from "./upload.controller.js";
import {
  ensureAgencyDoesNotExist,
  createAgencyLogo,
  validateCreateAgencyRequest,
} from "../helpers/agency.helper.js";
import { generateFirstAgentUsername } from "../helpers/agent.helper.js";
import {
  createFirstAgentEntity,
  createAgencyEntity,
} from "../services/agency.service.js";
import { buildCreateAgencyResponse } from "../mappers/agency.response.js";
import { extractCreateAgencyPayload } from "../types/agency.type.js";
import { QueryFailedError } from "typeorm";
import { sendAgencyCreatedEmail } from "../services/nodemailer/createAgency.service.js";

/**
 *  Create a new agency along with the first agent (admin) for that agency.
 * The request must be multipart/form-data and include the agency details (name, email, phone number) and the first agent details (first name, last name, phone number).
 * Optionally, a logo file can be included in the request.
 * The function checks if an agency with the same name or email already exists and returns a 409 error if so.
 * If the creation is successful, it returns the created agency and agent details along with the generated username and temporary password for the first agent.
 * @param req Request with body containing agency and first agent details, and optionally a logo file
 * @param res Response with created agency and agent details or error message
 * @returns JSON with created agency and agent details or error message
 */
export const createNewAgencyWithFirstAgent = async (
  req: Request,
  res: Response,
) => {
  console.log("=== START createNewAgencyWithFirstAgent ===");
  const file = req.file;

  console.log("BODY:", req.body);
  console.log("FILE:", req.file);
  const validationError = validateCreateAgencyRequest(req);
  if (validationError) {
    return res.status(400).json({ error: { message: validationError } });
  }
  console.log("Validation passed, proceeding with agency creation...");
  const queryRunner = AppDataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    const agencyRepo = queryRunner.manager.getRepository(Agency);
    const agentRepo = queryRunner.manager.getRepository(Agent);
    const logoRepo = queryRunner.manager.getRepository(Logo);

    const payload = extractCreateAgencyPayload(req);

    await ensureAgencyDoesNotExist(agencyRepo, payload.name, payload.email);

    const savedAgency = await createAgencyEntity(agencyRepo, payload);
    console.log("🏢 Agency created:", savedAgency);
    if (file) {
      console.log("🖼️ Creating logo with file:", file.filename);

      await createAgencyLogo({
        logoRepo,
        file,
        agency: savedAgency,
        baseUrl: `${req.protocol}://${req.get("host")}`,
      });
    }
    console.log("✅ Logo saved");
    const username = await generateFirstAgentUsername(
      agentRepo,
      savedAgency.id,
      payload.firstName,
      payload.lastName,
    );

    const temporaryPassword = generateTemporaryPassword();
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const savedAgent = await createFirstAgentEntity(agentRepo, {
      agency: savedAgency,
      firstName: payload.firstName,
      lastName: payload.lastName,
      phoneNumber: payload.agentPhoneNumber,
      username,
      hashedPassword,
    });
    console.log("👨‍💼 Agent created:", savedAgent);

    await queryRunner.commitTransaction();

    try {
      await sendAgencyCreatedEmail({
        to: savedAgency.email,
        agencyName: savedAgency.name,
        agencyEmail: savedAgency.email,
        agentUsername: username,
        temporaryPassword: temporaryPassword,
      });
      console.log("📧 Agency created email sent successfully");
    } catch (mailError) {
      console.error("Failed to send agency created email:", mailError);
    }

    return res.status(201).json(
      buildCreateAgencyResponse({
        agency: savedAgency,
        agent: savedAgent,
        username,
        temporaryPassword,
      }),
    );
  } catch (error: unknown) {
    try {
      await queryRunner.rollbackTransaction();
    } catch (rollbackError) {
      console.error("Error during rollback:", rollbackError);
    }

    if (file) {
      await deleteUploadedFilesSafe([file]);
    }

    console.error("createNewAgencyWithFirstAgent error:", error);

    if (error instanceof Error) {
      if (error.message === "AGENCY_NAME_ALREADY_EXISTS") {
        return res
          .status(409)
          .json({ error: { message: "Il nome dell'agenzia esiste già" } });
      }

      if (error.message === "AGENCY_EMAIL_ALREADY_EXISTS") {
        return res
          .status(409)
          .json({ error: { message: "L'email dell'agenzia esiste già" } });
      }
    }

    let pgDetail: string | undefined;
    let pgCode: string | undefined;

    if (error instanceof QueryFailedError) {
      const driverErr = error.driverError as { detail?: string; code?: string };
      pgDetail = driverErr?.detail;
      pgCode = driverErr?.code;
    }

    return res.status(500).json({
      error: { message: "Impossibile creare l'agenzia" },
      pgCode,
      pgDetail,
    });
  } finally {
    await queryRunner.release();
  }
};
