import express from "express";
const router = express.Router();
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import {
  createNewAgent,
  deleteAgent,
} from "../controllers/agent.controller.js";

router.post("/createAgent", authenticationMiddlewareAgent, createNewAgent);
router.delete("/delete/:id", authenticationMiddlewareAgent, deleteAgent);

export default router;
