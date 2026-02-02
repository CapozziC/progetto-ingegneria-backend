import { registerUser } from "../controllers/auth.controller.js";
import express from "express";

// Create a router instance
const router = express.Router();

router.post("/register", registerUser);

export default router;