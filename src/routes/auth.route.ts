import {
  registerAccount,
  loginAccount,
  logoutAccount,
} from "../controllers/auth.account.controller.js";
import { createNewAgencyWithFirstAgent } from "../controllers/auth.agency.controller.js";
import {
  loginAgent,
  logoutAgent,
  changePasswordFirstLogin,
} from "../controllers/auth.agent.controller.js";
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import {
  authenticationMiddlewareAgent,
  authAgentFirstLoginOnly,
} from "../middleware/auth.agent.middleware.js";
import { validateBody } from "../middleware/validate.middleware.js";
import {
  changePasswordAgentSchema,
  loginAgentSchema,
  loginAccountSchema,
  registerAccountSchema,
  createNewAgencyWithFirstAgentSchema,
} from "../validations/auth.validation.js";
import { uploadLogo } from "../utils/multer.utils.js";
import express from "express";

// Create a router instance
const router = express.Router();

router.post(
  "/account/register",
  validateBody(registerAccountSchema),
  registerAccount,
);
router.post("/account/login", validateBody(loginAccountSchema), loginAccount);
router.post("/agent/login", validateBody(loginAgentSchema), loginAgent);
router.post("/agent/logout", authenticationMiddlewareAgent, logoutAgent);
router.post("/account/logout", authenticationMiddlewareAccount, logoutAccount);
router.post(
  "/agency/create",
  uploadLogo,
  validateBody(createNewAgencyWithFirstAgentSchema),
  createNewAgencyWithFirstAgent,
);
router.post(
  "/agent/login/change_password",
  validateBody(changePasswordAgentSchema),
  authAgentFirstLoginOnly,
  changePasswordFirstLogin,
);

export default router;
