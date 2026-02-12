import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  createAgent,
  saveAgent,
  findAgentsByAgencyAndUsernamePrefix,
  findAgentsByAgencyIdAndUsername,
} from "../repositories/agent.repository.js";
import {
  normalizeUsernameBase,
  nextUsernameFromExisting,
} from "../utils/username.utils.js";
import { generateTemporaryPassword } from "../utils/password.utils.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  revokeRefreshToken,
} from "../utils/auth.utils.js";
import {
  createRefreshToken,
  saveRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { RequestAgent } from "../types/express.js";
import { Type } from "../entities/refreshToken.js";

export const createNewAgent = async (req: RequestAgent, res: Response) => {
  try {
    const { firstName, lastName, phoneNumber, isAdmin } = req.body;
    const Agent = req.agent;
    if (!Agent) {
      return res.status(403).json({ error: "Agent not found" });
    }
    if (!Agent.isAdmin) {
      return res
        .status(403)
        .json({ error: "Unauthorized: Only admin can create other agents" });
    }

    if (!Agent.agency) {
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
      await findAgentsByAgencyAndUsernamePrefix(Agent.agency.id, usernameBase)
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
      agency: Agent.agency,
      administrator: Agent.administrator,
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

export const loginAgent = async (req: Request, res: Response) => {
  try {
    const { agencyId, username, password } = req.body;

    if (!agencyId) {
      return res.status(400).json({ error: "Agency ID is required" });
    }

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }

    const agent = await findAgentsByAgencyIdAndUsername(agencyId, username);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const isPasswordValid = await bcrypt.compare(password, agent.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: "Invalid password" });
    }

    const accessToken = generateAccessToken(
      { subjectId: agent.id, type: Type.AGENT },
      process.env.ACCESS_TOKEN_SECRET!,
      "15m",
    );

    const refreshToken = generateRefreshToken(
      { subjectId: agent.id, type: Type.AGENT },
      process.env.REFRESH_TOKEN_SECRET!,
      "7d",
    );

    if (!accessToken || !refreshToken) {
      return res.status(500).json({ error: "Failed to generate tokens" });
    }

    const hashedRefreshToken = hashRefreshToken(refreshToken);
    if (!hashedRefreshToken) {
      return res.status(500).json({ error: "Failed to hash refresh token" });
    }

    await revokeRefreshToken(agent.id, Type.AGENT);

    const refreshTokenEntry = createRefreshToken({
      subjectId: agent.id,
      id: hashedRefreshToken,
      type: Type.AGENT,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const savedRefreshToken = await saveRefreshToken(refreshTokenEntry);
    if (!savedRefreshToken) {
      return res.status(500).json({ error: "Failed to save refresh token" });
    }

    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("accessToken", accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 15 * 60 * 1000,
    });

    return res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
export const LogoutAgent = async (req: RequestAgent, res: Response) => {
  try {
    const agent = req.agent;
    if (!agent) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await revokeRefreshToken(agent.id, Type.AGENT);
    res.clearCookie("accessToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    res.clearCookie("refreshToken", {
      httpOnly: true,
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    });
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
