import {Response } from "express";
import bcrypt from "bcryptjs";
import { findAgentByUsername } from "../repositories/agent.repository.js";
import { RequestAgent } from "../types/express.js";
import {
  generateAccessToken,
  generateRefreshToken ,
   hashRefreshToken,
   revokeRefreshToken,
} from "../utils/auth.utils.js";
import {
  createRefreshToken,
  saveRefreshToken,
} from "../repositories/refreshToken.repository.js";
import { Type } from "../entities/refreshToken.js";

export const loginAgent = async (req:RequestAgent, res: Response) => {
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

    await revokeRefreshToken(agent.id,Type.AGENT)

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


