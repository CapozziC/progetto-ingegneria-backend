import { Request } from "express";
import type { Account } from "../src/entities/account.ts";
import type { Agent } from "../src/entities/agent.ts";

export interface RequestAccount extends Request {
  account?: Account;
}

export interface RequestAgent extends Request {
  agent?: Agent;
}
