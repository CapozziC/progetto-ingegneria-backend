import {
  registerAccount,
  loginAccount,
  LogoutAccount,
} from "../controllers/auth.account.controller.js";
import { createNewAgencyWithFirstAgent } from "../controllers/auth.agency.controller.js";
import {
  loginAgent,
  LogoutAgent,
  changePasswordFirstLogin,
} from "../controllers/auth.agent.controller.js";
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import {
  authenticationMiddlewareAgent,
  authAgentFirstLoginOnly,
} from "../middleware/auth.agent.middleware.js";
import { uploadLogo } from "../utils/multer.utils.js";
import express from "express";

// Create a router instance
const router = express.Router();

router.post("/account/register", registerAccount);
router.post("/account/login", loginAccount);
router.post("/agent/login", loginAgent);
router.post("/agent/logout", authenticationMiddlewareAgent, LogoutAgent);
router.post("/account/logout", authenticationMiddlewareAccount, LogoutAccount);
router.post("/agency/create", uploadLogo, createNewAgencyWithFirstAgent);

router.post(
  "/agent/login/change_password",
  authAgentFirstLoginOnly,
  changePasswordFirstLogin,
);

export default router;
