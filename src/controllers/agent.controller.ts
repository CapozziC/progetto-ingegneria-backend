import { RequestAgent } from "../types/express.js";
import { Response } from "express";
import bcrypt from "bcryptjs";
import {
  createAgent,
  saveAgent,
  findAgentsByAgencyAndUsernamePrefix,
  findAgentCreatedByAdmin,
  updateAgentPhoneNumber,
} from "../repositories/agent.repository.js";
import { AppDataSource } from "../data-source.js";
import {
  normalizeUsernameBase,
  nextUsernameFromExisting,
} from "../utils/username.utils.js";
import { requireAdmin, requireAgent } from "../utils/require.utils.js";
import { generateTemporaryPassword } from "../utils/password.utils.js";
import { Advertisement } from "../entities/advertisement.js";
import { Agent } from "../entities/agent.js";
import { findAdvertisementsByAgentId } from "../repositories/advertisement.repository.js";
import { parsePositiveInt } from "../utils/objectParse.utils.js";

/**
 * Create a new agent under the same agency of the admin creating it, with a generated username and temporary password.
 * Only admin agents can create new agents.
 * @param req RequestAgent with body containing firstName, lastName, phoneNumber and isAdmin of the new agent to create. The authenticated admin agent must be in req.agent.
 * @param res Response with success message and credentials of the created agent or error message
 * @returns JSON with success message and credentials of the created agent or error message
 */
export const createNewAgent = async (req: RequestAgent, res: Response) => {
  try {
    const { firstName, lastName, phoneNumber, isAdmin } = req.body;
    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (!firstName || !lastName) {
      return res
        .status(400)
        .json({ error: "First name and last name are required" });
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: "Phone number is required" });
    }
    const usernameBase = normalizeUsernameBase(firstName, lastName);
    const existingUsernames = (
      await findAgentsByAgencyAndUsernamePrefix(admin.agency.id, usernameBase)
    ).map((a) => a.username);

    const username = nextUsernameFromExisting(usernameBase, existingUsernames);

    const temporaryPassword = generateTemporaryPassword();
    //Inserire logica per invio email con temporary password e username
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    // Create and save the new agent
    const newAgent = createAgent({
      firstName,
      lastName,
      username: username,
      password: hashedPassword,
      phoneNumber,
      isAdmin: Boolean(isAdmin),
      agency: admin.agency,
      administrator: admin,
    });

    const savedAgent = await saveAgent(newAgent);
    return res.status(201).json({
      message: "Agent created successfully",
      agentId: savedAgent.id,
      username: savedAgent.username,
      temporaryPassword: temporaryPassword,
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Delete an agent created by the authenticated admin, reassigning all their advertisements to the admin,
 * in a single transaction. Only admin agents can delete agents, and they cannot delete themselves.
 * @param req RequestAgent with authenticated admin agent in req.agent and agent id to delete in req.params.id
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */
export const deleteAgent = async (req: RequestAgent, res: Response) => {
  try {
    const agentIdToDelete = parsePositiveInt(req.params.id);
    const admin = requireAdmin(req, res);
    if (!admin) return;

    if (!agentIdToDelete) {
      return res.status(400).json({ error: "Agent id to delete is required" });
    }
    if (agentIdToDelete === admin.id) {
      return res.status(400).json({ error: "Admin cannot delete themselves" });
    }

    const agentToDelete = await findAgentCreatedByAdmin(
      agentIdToDelete,
      admin.agency.id,
      admin.id,
    );

    if (!agentToDelete) {
      return res.status(404).json({
        error: "Agent not found or you are not allowed to delete this agent",
      });
    }

    await AppDataSource.transaction(async (manager) => {
      //lock dell'agente da eliminare

      await manager.getRepository(Agent).findOne({
        where: { id: agentIdToDelete },
        lock: { mode: "pessimistic_write" },
      });

      // 2) riassegna TUTTI gli advertisements dall'agente->admin
      await manager.getRepository(Advertisement).update(
        {
          agent: { id: agentIdToDelete },
        },
        {
          agent: { id: admin.id },
        },
      );

      // 3) elimina l'agente
      await manager.getRepository(Agent).delete({
        id: agentIdToDelete,
        agency: { id: admin.agency.id },
      });
    });

    return res.status(200).json({
      message:
        "Agent deleted successfully (advertisements transferred to admin)",
    });
  } catch (error) {
    console.error("Delete agent error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get all advertisements of the authenticated agent
 * @param req RequestAgent with authenticated agent in req.agent
 * @param res Response with list of advertisements of the authenticated agent or error message
 * @returns   JSON with list of advertisements of the authenticated agent or error message
 */
export const getAgentAdvByAgentId = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    //Controllo autenticazione
    const agent = requireAgent(req, res);
    if (!agent) return;

    const advertisements = await findAdvertisementsByAgentId(agent.id);
    return res.status(200).json({
      count: advertisements.length,
      advertisements,
    });
  } catch (err) {
    console.error(" getAgentAdvByAgentId error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Update the phone number of the authenticated agent
 * @param req RequestAgent with authenticated agent in req.agent and phone number in req.body.phoneNumber
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */

export const updatePhoneNumberAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const { phoneNumber } = req.body;
    const agent = requireAgent(req, res);
    if (!agent) return;

    if (!phoneNumber) {
      return res.status(400).json({
        error: "Phone number is required",
      });
    }

    await updateAgentPhoneNumber(agent.id, phoneNumber);

    return res.status(200).json({
      message: "Phone number updated successfully",
    });
  } catch (err) {
    console.error("updateMyPhoneNumber error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
