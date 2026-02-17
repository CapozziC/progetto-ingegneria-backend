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
import { generateTemporaryPassword } from "../utils/password.utils.js";
import { Advertisement } from "../entities/advertisement.js";
import { Agent } from "../entities/agent.js";
import { findAdvertisementsByAgentId } from "../repositories/advertisement.repository.js";

export const createNewAgent = async (req: RequestAgent, res: Response) => {
  try {
    const { firstName, lastName, phoneNumber, isAdmin } = req.body;
    const agent = req.agent;
    //Controllo autenticazione
    if (!agent) {
      return res
        .status(403)
        .json({ error: "Unauthorized: agent not logged in" });
    }
    if (!agent.isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Only admin can create other agents" });
    }

    if (!agent.agency) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Agent does not belong to any agency" });
    }

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
      await findAgentsByAgencyAndUsernamePrefix(agent.agency.id, usernameBase)
    ).map((agent) => agent.username);

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
      isAdmin,
      //agency: agent.agency,
      agency: agent.agency,
      administrator: agent,
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

export const deleteAgent = async (req: RequestAgent, res: Response) => {
  try {
    const agentIdToDelete = Number(req.params.id);
    const admin = req.agent;

    if (!admin) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    if (!admin.isAdmin) {
      return res.status(403).json({ error: "Only admin can delete agents" });
    }
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

export const getAgentAdvByAgentId = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    //Controllo autenticazione
    const agent = req.agent;
    if (!agent) {
      return res
        .status(401)
        .json({ error: "Unauthorized: agent not logged in" });
    }

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

export const updatePhoneNumberAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const { phoneNumber } = req.body;
    const agent = req.agent;
    if (!agent) {
      return res.status(401).json({
        error: "Unauthorized: agent not logged in",
      });
    }

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
