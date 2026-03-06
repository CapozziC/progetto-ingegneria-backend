import type { Response } from "express";
import { RequestAccount } from "../types/express.js";

import { requireAccount } from "../utils/require.utils.js";
import { deleteAccountById } from "../repositories/account.repository.js";

export const deleteAccount = async (req: RequestAccount, res: Response) => {
  const account = requireAccount(req, res);
  if (!account) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const accountId = Number(req.params.id);
  if (!Number.isInteger(accountId)) {
    return res.status(400).json({ error: "Invalid account ID" });
  }
  try {
    if (account.id !== accountId) {
      return res.status(403).json({
        error: "Unauthorized,  only the account owner can delete their account",
      });
    }
    await deleteAccountById(account.id);
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("deleteAccount error:", err);
    return res.status(500).json({ error: "Failed to delete account" });
  }
};
