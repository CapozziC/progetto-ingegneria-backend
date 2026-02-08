import {
  registerAccount,
  loginAccount
} from "../controllers/auth.account.controller.js";
import { loginAgent } from "../controllers/auth.agent.controller.js";
import express from "express";

// Create a router instance
const router = express.Router();

router.post("/user/register", registerAccount);
router.post("/user/login", loginAccount);
router.post("/agent/login", loginAgent);

export default router;
