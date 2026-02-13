import express from "express";
const router = express.Router();
import { authenticationMiddlewareAgent } from "../middleware/auth.agent.middleware.js";
import { uploadPhotos } from "../utils/multer.utils.js";
import { parseJsonFields } from "../utils/objectParse.utils.js";
import { validateBody } from "../middleware/validate.middleware.js";
import { createAdvertisementSchema } from "../validations/advertisement.validation.js";
import { createAdvertisementWithRealEstateAndPhotosTx } from "../controllers/advertisment.controller.js";

router.post(
  "/advertisements",
  authenticationMiddlewareAgent,
  uploadPhotos,
  parseJsonFields(["realEstate"]),
  validateBody(createAdvertisementSchema),
  createAdvertisementWithRealEstateAndPhotosTx,
);

export default router;
