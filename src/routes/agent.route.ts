import express from "express";
const router = express.Router();
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import {
  createNewAgent,
  deleteAgent,
  getAgentAdvByAgentId,
  updatePhoneNumberAgent,
} from "../controllers/agent.controller.js";

router.post("/createAgent", authenticationMiddlewareAgent, createNewAgent);
router.delete("/delete/:id", authenticationMiddlewareAgent, deleteAgent);
router.get("/myAdv", authenticationMiddlewareAgent, getAgentAdvByAgentId);
router.patch(
  "/update/phoneNumber",
  authenticationMiddlewareAgent,
  updatePhoneNumberAgent,
);

export default router;
