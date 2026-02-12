import {
  registerAccount,
  loginAccount,
} from "../controllers/auth.account.controller.js";
import { createNewAgencyWithFirstAgent } from "../controllers/auth.agency.controller.js";
import {
  loginAgent,
  createNewAgent,
} from "../controllers/auth.agent.controller.js";
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import express from "express";

// Create a router instance
const router = express.Router();

router.post("/user/register", registerAccount);
router.post("/user/login", loginAccount);
router.post("/agent/login", loginAgent);
router.post("/agency/create", createNewAgencyWithFirstAgent);
router.post(
  "/agent/createAgent",
  authenticationMiddlewareAgent,
  createNewAgent,
);

export default router;
