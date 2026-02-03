import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { findAgentByUsername } from "../db/repositories/agent.repository.js";
import {
  generateAccessToken,
  generateRefreshToken ,
   hashRefreshToken,
} from "../utils/auth.utils.js";
import {
  createRefreshToken,
  saveRefreshToken,
} from "../db/repositories/refreshToken.repository.js";
import { Type } from "../db/entities/refreshToken.js";

export const loginAgent = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username) {
      return res.status(400).json({ error: "Username is required" });
    }
    if (!password) {
      return res.status(400).json({ error: "Password is required" });
    }
    const agent = await findAgentByUsername(username);
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

    res.cookie("agentRefreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.cookie("agentAccessToken", accessToken, {
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


