import { registerUser } from "../controllers/auth.user.controller.js";
import express from "express";

// Create a router instance
const router = express.Router();

router.post("/user/register", registerUser);

export default router;
