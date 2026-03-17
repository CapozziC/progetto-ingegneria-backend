import express from "express";
const router = express.Router();
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import { uploadPhotos, uploadSinglePhoto } from "../config/multer.config.js";
import { parseJsonFields } from "../utils/parse.utils.js";
import {
  validateBody,
  validateParams,
} from "../middleware/validate.middleware.js";
import {
  createAdvertisementSchema,
  createAppointmentBodySchema,
  createOfferByAccountBodySchema,
  advertisementParamsSchema,
  updateAdvertisementSchema,
} from "../validations/advertisement.validation.js";
import {
  createAdvertisementWithRealEstateAndPhotosTx,
  deleteAgentAdvertisement,
  replaceAgentAdvertisementPhotoAgent,
  updateAgentAdvertisement,
} from "../controllers/advertisement.controller.js";
import {
  getAvailableDays,
  createAppointment,
  getAvailableSlotsByDay,
} from "../controllers/appointment.controller.js";
import { authenticationMiddlewareAccount } from "../middleware/auth.account.middleware.js";
import { createOfferByAccount } from "../controllers/offer.controller.js";

router.post(
  "/create",
  authenticationMiddlewareAgent,
  uploadPhotos,
  parseJsonFields(["realEstate"]),
  validateBody(createAdvertisementSchema),
  createAdvertisementWithRealEstateAndPhotosTx,
);

router.patch(
  "/update/:id",
  authenticationMiddlewareAgent,
  parseJsonFields(["realEstate"]),
  validateBody(updateAdvertisementSchema),
  validateParams(advertisementParamsSchema),
  updateAgentAdvertisement,
);

router.put(
  "/agent/advertisements/:advertisementId/photos/:photoId",
  authenticationMiddlewareAgent,
  uploadSinglePhoto,
  replaceAgentAdvertisementPhotoAgent,
);

router.delete(
  "/delete/:id",
  authenticationMiddlewareAgent,
  validateParams(advertisementParamsSchema),
  deleteAgentAdvertisement,
);

// Routes for appointments
router.get(
  "/:id/available-days",
  authenticationMiddlewareAccount,
  getAvailableDays,
);
router.get(
  "/:id/available-days/:day",
  authenticationMiddlewareAccount,
  getAvailableSlotsByDay,
);

router.post(
  "/create_appointments/:id",
  authenticationMiddlewareAccount,
  validateBody(createAppointmentBodySchema),
  validateParams(advertisementParamsSchema),
  createAppointment,
);

//Routes for offers
router.post(
  "/create_offer/:id",
  authenticationMiddlewareAccount,
  validateBody(createOfferByAccountBodySchema),
  validateParams(advertisementParamsSchema),
  createOfferByAccount,
);

export default router;
