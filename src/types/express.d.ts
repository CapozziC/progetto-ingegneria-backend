import { Request } from "express";
import type { Account } from "../entities/account.ts";
import type { Agent } from "../entities/agent.ts";

export interface RequestAccount extends Request {
  account?: Account;
}

export interface RequestAgent extends Request {
  agent?: Agent;
}
