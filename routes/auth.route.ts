import {
  registerUser,
  loginUser,
} from "../controllers/auth.user.controller.js";
import { loginAgent } from "../controllers/auth.agent.controller.js";
import express from "express";

// Create a router instance
const router = express.Router();

router.post("/user/register", registerUser);
router.post("/user/login", loginUser);
router.post("/agent/login", loginAgent);

export default router;
