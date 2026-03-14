import { RequestAgent } from "../types/express.js";
import { Response } from "express";
import bcrypt from "bcryptjs";
import {
  createAgent,
  saveAgent,
  findAgentsByAgencyAndUsernamePrefix,
  findAgentCreatedByAdmin,
  updateAgentPhoneNumber,
  findAgentById,
} from "../repositories/agent.repository.js";
import { AppDataSource } from "../data-source.js";
import {
  normalizeUsernameBase,
  nextUsernameFromExisting,
} from "../utils/username.utils.js";
import {
  requireAdmin,
  requireAgent,
} from "../middleware/require.middleware.js";
import { generateTemporaryPassword } from "../utils/password.utils.js";
import { Advertisement } from "../entities/advertisement.js";
import { Agent } from "../entities/agent.js";
import { findAdvertisementsByAgentId } from "../repositories/advertisement.repository.js";
import { parsePositiveInt } from "../utils/parse.utils.js";
import {
  findAgentNegotiations,
  findAgentNegotiationDetail,
} from "../repositories/offer.repository.js";
import { buildAdvertisementTitle } from "../helpers/advertisement-title.helper.js";
import { agentUpdatePassword } from "../repositories/agent.repository.js";
import { sendAgentCreatedEmail } from "../services/nodemailer/createAgent.service.js";

/**
 * Get the profile of the authenticated agent, including their ID, name, username, phone number, admin status, and associated agency information. The function checks for the authenticated agent in the request, retrieves their full details from the database using their ID, and returns a structured JSON response containing the agent's profile information. If the agent is not authenticated or if there is an error during retrieval, it returns an appropriate error response.
 * @param req RequestAgent with authenticated agent in req.agent
 * @param res Response with agent profile information or error message
 * @returns JSON with agent profile information or error message
 * Only authenticated agents can access their profile information.
 */
export const getAgentProfile = async (req: RequestAgent, res: Response) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const fullAgent = await findAgentById(agent.id);
    if (!fullAgent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    return res.status(200).json({
      id: agent.id,
      firstName: agent.firstName,
      lastName: agent.lastName,
      username: agent.username,
      phoneNumber: agent.phoneNumber,
      isAdmin: agent.isAdmin,
      agency: {
        id: agent.agency.id,
        name: agent.agency.name,
      },
    });
  } catch (error) {
    console.error("Error fetching agent profile:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

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
    // Inserire logica per invio email con temporary password e username
    const hashedPassword = await bcrypt.hash(temporaryPassword, 10);

    const newAgent = createAgent({
      firstName,
      lastName,
      username,
      password: hashedPassword,
      phoneNumber,
      isAdmin: Boolean(isAdmin),
      agency: admin.agency,
      administrator: admin,
    });

    const savedAgent = await saveAgent(newAgent);

    try {
      await sendAgentCreatedEmail({
        to: admin.agency.email,
        firstName: savedAgent.firstName,
        username: savedAgent.username,
        temporaryPassword,
      });
    } catch (emailError) {
      console.error("Error sending agent created email:", emailError);
    }

    return res.status(201).json({
      message: "Agent created successfully",
      agentId: savedAgent.id,
      username: savedAgent.username,
      temporaryPassword,
    });
  } catch (error) {
    console.error("Error creating agent:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};



/**
 * Update the phone number of the authenticated agent. The new phone number is provided in the request body. The function validates the input and updates the agent's phone number in the database. Only authenticated agents can update their phone number.
 * @param req RequestAgent with authenticated agent in req.agent and new phone number in req.body.phoneNumber
 * @param res Response with success message and updated phone number or error message
 * @returns JSON with success message and updated phone number or error message
 */
export const updatePhoneNumberAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const { phoneNumber } = req.body;

    if (typeof phoneNumber !== "string" || phoneNumber.trim() === "") {
      return res.status(400).json({
        error: "Invalid phone number",
      });
    }

    const cleanedPhoneNumber = phoneNumber.trim();

    await updateAgentPhoneNumber(agent.id, cleanedPhoneNumber);
    const updatedAgent = await findAgentById(agent.id);

    return res.status(200).json({
      message: "Phone number updated successfully",
      phoneNumber: updatedAgent?.phoneNumber,
    });
  } catch (err) {
    console.error("updateMyPhoneNumber error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};

/**
 * Update the password of the authenticated agent. The current password, new password and confirm password are provided in the request body. The function validates the input, checks if the current password is correct, and updates the agent's password in the database if everything is valid. Only authenticated agents can update their password, and they can only update their own password.
 * @param req   RequestAgent with authenticated agent in req.agent and currentPassword, newPassword and confirmPassword in req.body
 * @param res   Response with success message or error message
 * @returns   JSON with success message or error message
 * Only authenticated agents can update their password, and they can only update their own password.
 */
export const updateAgentPassword = async (req: RequestAgent, res: Response) => {
  try {
    const agent = requireAgent(req, res);
    if (!agent) return;

    const agentId = parsePositiveInt(req.params.agentId);
    if (!agentId) {
      return res.status(400).json({ error: "Invalid agent id" });
    }
    if (agent.id !== agentId) {
      return res
        .status(403)
        .json({ error: "Forbidden: cannot change another agent's password" });
    }

    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error:
          "Current password and new password are required",
      });
    }


    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "New password must be at least 8 characters long" });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      agent.password,
    );
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: "Current password is incorrect" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    await agentUpdatePassword(agent.id, hashedNewPassword);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("updateAgentPassword error:", err);
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
export const getAgentAdvertisements = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    //Controllo autenticazione
    const agent = requireAgent(req, res);
    if (!agent) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const advertisements = await findAdvertisementsByAgentId(agent.id);
    return res.status(200).json({
      items: advertisements.map((a) => ({
        id: a.id,
        title: buildAdvertisementTitle({
          rooms: a.realEstate?.rooms,
          addressFormatted: a.realEstate?.addressFormatted,
          housingType: a.realEstate?.housingType,
        }),
        description: a.description,
        price: a.price,
        type: a.type,
        status: a.status,
        agentId: a.agent?.id ?? agent.id,
        realEstate: a.realEstate,
        photos: (a.photos ?? []).sort((x, y) => x.position - y.position),
        pois: a.pois ?? [],
      })),
      count: advertisements.length,
    });
  } catch (err) {
    console.error(" getAgentAdvertisements error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * Get all negotiations of the authenticated agent, with pagination support (take, skip).
 * Each negotiation includes the related advertisement with a title built from rooms, address and housing type
 * and the related agent information (id, name, email)
 * and the related account information (id, name, email)
 * and the negotiation details (id, status, createdAt, updatedAt)
 * @param req RequestAgent with authenticated agent in req.agent and pagination parameters take and skip in req.query
 * @param res Response with list of negotiations of the authenticated agent or error message
 * @returns JSON with list of negotiations of the authenticated agent or error message
 */

export const getAgentNegotiations = async (
  req: RequestAgent,
  res: Response,
) => {
  const agent = requireAgent(req, res);
  if (!agent) return res.status(401).json({ error: "Unauthorized" });

  const take = Number(req.query.take ?? 20);
  const skip = Number(req.query.skip ?? 0);

  try {
    const result = await findAgentNegotiations({
      agentId: agent.id,
      take: Number.isFinite(take) && take > 0 ? take : 20,
      skip: Number.isFinite(skip) && skip >= 0 ? skip : 0,
    });

    return res.json(result);
  } catch (error) {
    console.error("Error fetching agent negotiations:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch agent negotiations" });
  }
};

/**
 *  Get the negotiation details for the authenticated agent for a specific advertisement and account.
 * The negotiation details include the related advertisement with a title built from rooms, address and housing type
 * and the related agent information (id, name, email)
 * and the related account information (id, name, email)
 * and the negotiation details (id, status, createdAt, updatedAt)
 * @param req RequestAgent with authenticated agent in req.agent, advertisementId and accountId in req.params
 * @param res Response with negotiation details for the specified advertisement and account or error message
 * @returns JSON with negotiation details for the specified advertisement and account or error message
 * Only the agent involved in the negotiation can access the negotiation details.
 */
export const getAgentNegotiationByAdvertisementAndAccount = async (
  req: RequestAgent,
  res: Response,
) => {
  const agent = requireAgent(req, res);
  if (!agent) return res.status(401).json({ error: "Unauthorized" });

  const advertisementId = parsePositiveInt(req.params.advertisementId);
  if (!advertisementId) {
    return res.status(400).json({ error: "Invalid advertisement id" });
  }

  const accountId = parsePositiveInt(req.params.accountId);
  if (!accountId) {
    return res.status(400).json({ error: "Invalid account id" });
  }

  try {
    const negotiation = await findAgentNegotiationDetail({
      agentId: agent.id,
      advertisementId,
      accountId,
    });

    if (!negotiation) {
      return res.status(404).json({ error: "Negotiation not found" });
    }

    return res.json(negotiation);
  } catch (error) {
    console.error("Error fetching agent negotiation detail:", error);
    return res
      .status(500)
      .json({ error: "Failed to fetch agent negotiation detail" });
  }
};
