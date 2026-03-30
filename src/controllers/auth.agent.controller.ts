import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import {
  findAgentById,
  findAgentsByAgencyIdAndUsername,
  findAgentByUsername,
  saveAgent,
} from "../repositories/agent.repository.js";
import {
  generateAccessToken,
  generateRefreshToken,
  generateResetToken,
  hashRefreshToken,
} from "../utils/auth.utils.js";

import {
  setAuthCookies,
  clearAuthCookies,
  setFirstLoginAccessCookie,
} from "../utils/cookie.utils.js";
import {
  createRefreshToken,
  saveRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { findAllAgencies } from "../repositories/agency.repository.js";
import { AppDataSource } from "../data-source.js";
import { RequestAgent } from "../types/express.js";
import { Type } from "../entities/refreshToken.js";
import { Agent } from "../entities/agent.js";
import { revokeRefreshToken } from "../services/auth.service.js";
import { sendAgentForgotPasswordEmail } from "../services/nodemailer/agentForgotPassword.service.js";
import { RequestWithResetToken } from "../types/auth.type.js";

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const RESET_TOKEN_SECRET = process.env.RESET_TOKEN_SECRET;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET || !RESET_TOKEN_SECRET) {
  throw new Error("Missing token secrets in environment variables");
}
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
      return res.status(401).json({ error: "credenziali errate" });
    }

    if (!agent.isPasswordChange) {
      const accessToken = generateAccessToken(
        {
          subjectId: agent.id,
          type: Type.AGENT,
        },
        ACCESS_TOKEN_SECRET,
        "10m",
      );

      setFirstLoginAccessCookie(res, accessToken);

      return res.status(200).json({
        message: "Password change required",
        isPasswordChange: false,
        agent: {
          id: agent.id,
          username: agent.username,
          isAdmin: agent.isAdmin,
          agency: agent.agency,
          firstName: agent.firstName,
          lastName: agent.lastName,
          phoneNumber: agent.phoneNumber,
          createdAt: agent.createdAt,
        },
      });
    }

    const accessToken = generateAccessToken(
      { subjectId: agent.id, type: Type.AGENT },
      ACCESS_TOKEN_SECRET,
      "20m",
    );

    const refreshToken = generateRefreshToken(
      { subjectId: agent.id, type: Type.AGENT },
      REFRESH_TOKEN_SECRET,
      "6d",
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
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000), // 6 days
    });

    const savedRefreshToken = await saveRefreshToken(refreshTokenEntry);
    if (!savedRefreshToken) {
      return res.status(500).json({ error: "Failed to save refresh token" });
    }

    setAuthCookies(res, accessToken, refreshToken);

    return res.status(200).json({
      id: agent.id,
      username: agent.username,
      agency: agent.agency,
      firstName: agent.firstName,
      lastName: agent.lastName,
      phoneNumber: agent.phoneNumber,
      isAdmin: agent.isAdmin,
      createdAt: agent.createdAt,
    });
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
export const logoutAgent = async (req: RequestAgent, res: Response) => {
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

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: "currentPassword and newPassword are required",
      });
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
      ACCESS_TOKEN_SECRET,
      "20m",
    );

    const refreshToken = generateRefreshToken(
      { subjectId: freshAgent.id, type: Type.AGENT },
      REFRESH_TOKEN_SECRET,
      "6d",
    );

    const hashedRefreshToken = hashRefreshToken(refreshToken);

    const refreshTokenEntry = createRefreshToken({
      subjectId: freshAgent.id,
      id: hashedRefreshToken,
      type: Type.AGENT,
      expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
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
/**
 * Get all agencies. This function retrieves all agencies from the database and returns them in the response. If an error occurs during the retrieval process, it logs the error and returns a 500 Internal Server Error response with an appropriate error message.
 * @param req Request object (not used in this function)
 * @param res Response object with status and JSON data containing the list of agencies or an error message
 * @returns JSON response with the list of agencies or an error message
 */
export const getAllAgency = async (req: Request, res: Response) => {
  try {
    const agencies = await findAllAgencies();
    return res.status(200).json({ agencies });
  } catch (err) {
    console.error("getAllAgency error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * Handle the forgot password process for an agent. This function takes the username from the request body, checks if an agent with that username exists, and if so, generates a reset token and sends a forgot password email to the agent's associated agency email address. If the username is not provided or if no agent is found with the given username, it returns an appropriate error response. If an error occurs during the process, it logs the error and returns a 500 Internal Server Error response with an appropriate error message.
 * @param req Request object containing the username in the body
 * @param res Response object with status and JSON data containing a success message or an error message
 * @returns JSON response with a success message if the email was sent successfully, or an error message if there was an issue with the request or if an internal server error occurred
 */
export const forgotAgentPassword = async (req: Request, res: Response) => {
  try {
    const { username, agencyId } = req.body;

    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }

    if (!agencyId) {
      return res.status(400).json({ error: "Agency ID is required" });
    }

    const agent = await findAgentByUsername(username);

    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const resetToken = generateResetToken(
      { subjectId: agent.id, type: Type.AGENT },
      RESET_TOKEN_SECRET,
      "10m",
    );

    await sendAgentForgotPasswordEmail({
      to: agent.agency.email,
      username: agent.username,
      token: resetToken,
    });

    return res.status(200).json({
      message: "Reset password email sent",
    });
  } catch (error) {
    console.error("Forgot agent password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
/**
 * Reset the password of an agent using a reset token. This function takes the new password from the request body and the reset token from the request (which should have been verified by middleware). It checks if the reset token is valid and corresponds to an agent, and if so, it hashes the new password, updates the agent's password in the database, and returns a success message. If any step fails (e.g., missing new password, invalid token, agent not found), it returns an appropriate error response. If an error occurs during the process, it logs the error and returns a 500 Internal Server Error response with an appropriate error message.
 * @param req Request object containing the new password in the body and the reset token in req.resetToken
 * @param res Response object with status and JSON data containing a success message or an error message
 * @returns JSON response with a success message if the password was reset successfully, or an error message if there was an issue with the request, token validation, or if an internal server error occurred
 */
export const resetAgentPassword = async (
  req: RequestWithResetToken,
  res: Response,
) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ error: "New password is required" });
    }

    const resetToken = req.resetToken;
    if (!resetToken) {
      return res.status(401).json({ error: "Missing reset token payload" });
    }

    if (resetToken.type !== Type.AGENT) {
      return res.status(403).json({ error: "Invalid token type" });
    }

    const agent = await findAgentById(resetToken.subjectId);
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    agent.password = hashedPassword;
    await saveAgent(agent);

    return res.status(200).json({
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Reset agent password error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
