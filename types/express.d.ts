import type { Account } from "../db/entities/account.js";
import type { Agent } from "../db/entities/agent.js";

declare global {
  namespace Express {
    interface Request {
      account?: Account;
      agent?: Agent;
    }
  }
}

export {};
