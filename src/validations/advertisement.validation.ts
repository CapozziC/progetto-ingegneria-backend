import Joi from "joi";
import { EnergyClass, Type as HousingType } from "../entities/realEstate.js";
import {
  Type as AdvType,
  Status as AdvStatus,
} from "../entities/advertisement.js";

export const createAdvertisementSchema = Joi.object({
  description: Joi.string().trim().min(1).max(500).required(),
  price: Joi.number().positive().required(),
  type: Joi.string()
    .valid(...Object.values(AdvType))
    .required(),
  status: Joi.string()
    .valid(...Object.values(AdvStatus))
    .default(AdvStatus.ACTIVE),

  realEstate: Joi.object({
    size: Joi.number().integer().positive().required(),
    rooms: Joi.number().integer().positive().required(),
    floor: Joi.number().integer().required(),

    elevator: Joi.boolean().default(false),
    airConditioning: Joi.boolean().default(false),
    heating: Joi.boolean().default(false),
    concierge: Joi.boolean().default(false),
    parking: Joi.boolean().default(false),
    garage: Joi.boolean().default(false),
    furnished: Joi.boolean().default(false),
    solarPanels: Joi.boolean().default(false),
    balcony: Joi.boolean().default(false),
    terrace: Joi.boolean().default(false),
    garden: Joi.boolean().default(false),

    energyClass: Joi.string()
      .valid(...Object.values(EnergyClass))
      .required(),
    housingType: Joi.string()
      .valid(...Object.values(HousingType))
      .required(),

    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required(),
      lng: Joi.number().min(-180).max(180).required(),
    }).required(),
  }).required(),
});
