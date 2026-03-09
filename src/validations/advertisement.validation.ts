import Joi from "joi";
import { EnergyClass, Type as HousingType } from "../entities/realEstate.js";
import {
  Type as AdvType,
  Status as AdvStatus,
} from "../entities/advertisement.js";

export const createAdvertisementSchema = Joi.object({
  description: Joi.string().trim().min(1).max(500).required().messages({
    "string.base": "Description must be a string",
    "string.empty": "Description cannot be empty",
    "string.min": "Description must be at least 1 character long",
    "string.max": "Description cannot be longer than 500 characters",
    "any.required": "Description is required",
    }),
  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be greater than 0",
    "any.required": "Price is required",
  }),
  type: Joi.string()
    .valid(...Object.values(AdvType))
    .required().messages({
      "string.base": "Type must be a string",
      "any.only": `Type must be one of ${Object.values(AdvType).join(", ")}`,
      "any.required": "Type is required",
    }),
  status: Joi.string()
    .valid(...Object.values(AdvStatus))
    .default(AdvStatus.ACTIVE).messages({
      "string.base": "Status must be a string",
      "any.only": `Status must be one of ${Object.values(AdvStatus).join(", ")}`,
    }),

  realEstate: Joi.object({
    size: Joi.number().integer().positive().required().messages({
      "number.base": "Size must be a number",
      "number.integer": "Size must be an integer",
      "number.positive": "Size must be positive",
      "any.required": "Size is required",
    }),
    rooms: Joi.number().integer().positive().required().messages({
      "number.base": "Rooms must be a number",
      "number.integer": "Rooms must be an integer",
      "number.positive": "Rooms must be positive",
      "any.required": "Rooms is required",
    }),
    floor: Joi.number().integer().required().messages({
      "number.base": "Floor must be a number",
      "number.integer": "Floor must be an integer",
      "any.required": "Floor is required",
    }),

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
      .required().messages({
        "string.base": "Energy class must be a string",
        "any.only": `Energy class must be one of ${Object.values(EnergyClass).join(", ")}`,
        "any.required": "Energy class is required",
      }),

    housingType: Joi.string()
      .valid(...Object.values(HousingType))
      .required().messages({
        "string.base": "Housing type must be a string",
        "any.only": `Housing type must be one of ${Object.values(HousingType).join(", ")}`,
        "any.required": "Housing type is required",
      }),

    addressInput: Joi.string().trim().min(3).max(300).messages({
      "string.base": "Address input must be a string",
      "string.min": "Address input must be at least 3 characters long",
      "string.max": "Address input cannot be longer than 300 characters",
    }),

    addressFormatted: Joi.string().trim().min(3).max(400).messages({
      "string.base": "Address formatted must be a string",
      "string.min": "Address formatted must be at least 3 characters long",
      "string.max": "Address formatted cannot be longer than 400 characters",
    }),
    placeId: Joi.string().trim().min(3).max(200).messages({
      "string.base": "Place ID must be a string",
      "string.min": "Place ID must be at least 3 characters long",
      "string.max": "Place ID cannot be longer than 200 characters",
    }),

    location: Joi.object({
      lat: Joi.number().min(-90).max(90).required().messages({
        "number.base": "Latitude must be a number",
        "number.min": "Latitude must be at least -90",
        "number.max": "Latitude must be at most 90",
        "any.required": "Latitude is required",
      }),
      lng: Joi.number().min(-180).max(180).required().messages({
        "number.base": "Longitude must be a number",
        "number.min": "Longitude must be at least -180",
        "number.max": "Longitude must be at most 180",
        "any.required": "Longitude is required",
      }),
    }),
  })

    .or("addressInput", "location")
    .with("addressFormatted", "addressInput")
    .with("placeId", "addressInput")
    .required(),
});


export const advertisementParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Advertisement ID must be a number",
    "number.integer": "Advertisement ID must be an integer",
    "number.positive": "Advertisement ID must be positive",
    "any.required": "Advertisement ID is required",
  })
  ,
});

export const createAppointmentBodySchema = Joi.object({
  appointmentAt: Joi.string().isoDate().required().messages({
    "string.base": "Appointment date must be a string",
    "string.isoDate": "Appointment date must be in ISO format",
    "any.required": "Appointment date is required",
  }),
});


export const createOfferByAccountBodySchema = Joi.object({
  price: Joi.number()
    .positive()
    .required()
    .messages({
      "number.base": "Price must be a number",
      "number.positive": "Price must be greater than 0",
      "any.required": "Price is required",
    }),
});