import { Request } from "express";
import type { Account } from "../db/entities/account.js";
import type { Agent } from "../db/entities/agent.js";

export interface RequestAccount extends Request {
  account?: Account;
}

export interface RequestAgent extends Request {
  agent?: Agent;
}
