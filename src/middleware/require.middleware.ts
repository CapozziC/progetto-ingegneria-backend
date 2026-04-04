import { Response } from "express";
import { RequestAgent,RequestAccount } from "../types/express.js";

export const requireAgent = (req: RequestAgent, res: Response) => {
  const agent = req.agent;
  if (!agent) {
    res.status(401).json({ error:{ message: "Unauthorized" } });
    return null;
  }
  return agent;
};

export const requireAdmin = (req: RequestAgent, res: Response) => {
  const agent = requireAgent(req, res);
  console.log("Authenticated agent:", agent);
  if (!agent) {
    res.status(401).json({ error: { message: "Unauthorized" } });
    return null;
  }

  if (!agent.isAdmin) {
    res
      .status(403)
      .json({ error: { message: " Only admin can perform this action" } });
    return null;
  }

  if (!agent.agency?.id) {
    res
      .status(403)
      .json({ error: { message: " Agent does not belong to any agency" } });
    return null;
  }

  return agent;
};

export const requireAccount = (req: RequestAccount, res: Response) => {
  const account = req.account;
  if (!account) {
    res.status(401).json({ error: { message: "Unauthorized" } });
    return null;
  }
  return account;
};
