import {
  registerAccount,
  loginAccount,
  logoutAccount,
  resetAccountPassword,
  forgotAccountPassword,
} from "../controllers/auth.account.controller.js";
import { createNewAgencyWithFirstAgent } from "../controllers/auth.agency.controller.js";
import {
  loginAgent,
  logoutAgent,
  changePasswordFirstLogin,
  getAllAgency,
  forgotAgentPassword,
  resetAgentPassword,
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
  registerAccountSchema,
  createNewAgencyWithFirstAgentSchema,
} from "../validations/auth.validation.js";
import { uploadLogo } from "../config/multer.config.js";
import express from "express";
import { RequestAccount, RequestAgent } from "../types/express.js";
import {
  requireAccount,
  requireAgent,
} from "../middleware/require.middleware.js";
import { verifyResetToken } from "../middleware/reset.middleware.js";
import { googleAuthAccount } from "../controllers/auth.google.account.controller.js";
import { mapAccountToResponse } from "../mappers/account.response.js";
import { mapAgentToResponse } from "../mappers/agent.response.js";

// Create a router instance
const router = express.Router();

//ACCOUNT AUTH ROUTES
router.post(
  "/account/register",
  validateBody(registerAccountSchema),
  registerAccount,
);
router.post("/account/login", loginAccount);
router.post("/account/google", googleAuthAccount);
router.post("/account/forgot_password", forgotAccountPassword);
router.post("/account/reset_password", verifyResetToken, resetAccountPassword);
router.post("/account/logout", authenticationMiddlewareAccount, logoutAccount);
//AGENT AUTH ROUTES
router.post("/agent/login", validateBody(loginAgentSchema), loginAgent);
router.get("/agencies", getAllAgency);
router.post(
  "/agent/login/change_password",
  validateBody(changePasswordAgentSchema),
  authAgentFirstLoginOnly,
  changePasswordFirstLogin,
);
router.post("/agent/forgot_password", forgotAgentPassword);
router.post("/agent/reset_password", verifyResetToken, resetAgentPassword);
router.post("/agent/logout", authenticationMiddlewareAgent, logoutAgent);
//AGENCY AUTH ROUTES
router.post(
  "/agency/create",
  uploadLogo,
  validateBody(createNewAgencyWithFirstAgentSchema),
  createNewAgencyWithFirstAgent,
);
//Rotta protetta per  verificare se l'account è autenticato
router.get("/account", authenticationMiddlewareAccount, (req, res) => {
  const account = requireAccount(req as RequestAccount, res);
  if (!account) return;

  return res.json({ account: mapAccountToResponse(account) });
});

//Rotta protetta per  verificare se l'agente è autenticato
router.get("/agent", authenticationMiddlewareAgent, (req, res) => {
  const agent = requireAgent(req as RequestAgent, res);
  if (!agent) return;

  return res.json(agent);
});

export default router;
