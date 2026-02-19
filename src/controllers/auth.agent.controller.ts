import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  findAgentById,
  findAgentsByAgencyIdAndUsername,
} from "../repositories/agent.repository.js";
import {
  generateAccessToken,
  generateRefreshToken,
  hashRefreshToken,
  revokeRefreshToken,
  setAuthCookies,
  clearAuthCookies,
} from "../utils/auth.utils.js";
import {
  createRefreshToken,
  saveRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { AppDataSource } from "../data-source.js";
import { RequestAgent } from "../types/express.js";
import { Type } from "../entities/refreshToken.js";
import { Agent } from "../entities/agent.js";

/**
 * Login an agent with the provided agency ID, username and password.
 * If the credentials are valid, an access token and a refresh token are generated and sent as httpOnly cookies.
 * If the agent is logging in for the first time (isPasswordChange=false), only an access token is sent and the client is informed that a password change is required.
 * @param req Request with body containing agencyId, username and password for the agent to login
 * @param res  Response with success message or error message
 * @returns   JSON with success message or error message
 */
export const loginAgent = async (req: Request, res: Response) => {
  try {
    const { agencyId, username, password } = req.body;
    console.log("\n========================================");
    console.log("🔐 AGENT LOGIN ATTEMPT");
    console.log("Received login data:", { agencyId, username });
    console.log("========================================");

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

    if (!agent.isPasswordChange) {
      const accessToken = generateAccessToken(
        {
          subjectId: agent.id,
          type: Type.AGENT,
        },
        process.env.ACCESS_TOKEN_SECRET!,
        "10m",
      );

      res.cookie("accessToken", accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 10 * 60 * 1000,
      });

      return res.status(200).json({
        message: "Password change required",
        isPasswordChange: false,
      });
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

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ message: "Login successful" });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Logout an agent by revoking their refresh token and clearing their access and refresh tokens from cookies.
 * @param req Request with authenticated agent in req.agent
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */
export const LogoutAgent = async (req: RequestAgent, res: Response) => {
  try {
    const agent = req.agent;
    if (!agent) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    await revokeRefreshToken(agent.id, Type.AGENT);
    clearAuthCookies(res);
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.error("Logout error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Change the password of an agent on first login.
 * The agent must provide the current temporary password, a new password and a confirmation of the new password.
 * If the current password is correct and the new password meets the requirements, the password is updated, isPasswordChange is set to true and any existing refresh tokens are revoked.
 * A new access token and refresh token are generated and sent as httpOnly cookies.
 * @param req Request with body containing currentPassword, newPassword and confirmPassword for the agent to change password
 * @param res Response with success message or error message
 * @returns JSON with success message or error message
 */
export const changePasswordFirstLogin = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const agent = req.agent;
    if (!agent) return res.status(401).json({ error: "Unauthorized" });

    // IMPORTANT: questo endpoint deve essere chiamabile SOLO se isChangePassword=false
    if (agent.isPasswordChange) {
      return res.status(400).json({ error: "Password change is not required" });
    }

    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        error: "currentPassword, newPassword, confirmPassword are required",
      });
    }
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: "Passwords do not match" });
    }

    if (newPassword.length < 8) {
      return res
        .status(400)
        .json({ error: "Password must be at least 8 characters" });
    }
    if (newPassword === currentPassword) {
      return res.status(400).json({
        error: "New password must be different from current password",
      });
    }

    // ricarica dal DB per essere sicuri di avere password aggiornata
    const freshAgent = await findAgentById(agent.id);
    if (!freshAgent) return res.status(404).json({ error: "Agent not found" });

    const ok = await bcrypt.compare(currentPassword, freshAgent.password);
    if (!ok)
      return res.status(401).json({ error: "Current password is incorrect" });

    const hashed = await bcrypt.hash(newPassword, 10);

    await AppDataSource.transaction(async (manager) => {
      await manager.getRepository(Agent).findOne({
        where: { id: freshAgent.id },
        lock: { mode: "pessimistic_write" },
      });

      await manager
        .getRepository(Agent)
        .update(
          { id: freshAgent.id },
          { password: hashed, isPasswordChange: true },
        );

      // invalida qualsiasi refresh token precedente
      await revokeRefreshToken(freshAgent.id, Type.AGENT);
    });

    const accessToken = generateAccessToken(
      { subjectId: freshAgent.id, type: Type.AGENT },
      process.env.ACCESS_TOKEN_SECRET!,
      "15m",
    );

    const refreshToken = generateRefreshToken(
      { subjectId: freshAgent.id, type: Type.AGENT },
      process.env.REFRESH_TOKEN_SECRET!,
      "7d",
    );

    const hashedRefreshToken = hashRefreshToken(refreshToken);

    const refreshTokenEntry = createRefreshToken({
      subjectId: freshAgent.id,
      id: hashedRefreshToken,
      type: Type.AGENT,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    await saveRefreshToken(refreshTokenEntry);
    // Set new tokens as httpOnly cookies
    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("changePasswordFirstLogin error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
