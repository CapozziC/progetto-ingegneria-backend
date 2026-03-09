import Joi from "joi";

export const createAgentSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(30).required().messages({
    "string.base": "First name must be a string",
    "string.min": "First name must be at least 2 characters long",
    "string.max": "First name cannot be longer than 30 characters",
    "any.required": "First name is required",
  }),
  lastName: Joi.string().trim().min(2).max(30).required().messages({
    "string.base": "Last name must be a string",
    "string.min": "Last name must be at least 2 characters long",
    "string.max": "Last name cannot be longer than 30 characters",
    "any.required": "Last name is required",
  }),
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^\+[1-9][0-9]{7,14}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Invalid phone number format. Use E.164 (+39333...)",
      "any.required": "Phone number is required",
    }),
  isAdmin: Joi.boolean().default(false),
}).unknown(false);

export const deleteAgentParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Agent ID must be a number",
    "number.integer": "Agent ID must be an integer",
    "number.positive": "Agent ID must be positive",
    "any.required": "Agent ID is required",
  }),
}).unknown(false);

export const updatePhoneNumberSchema = Joi.object({
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^\+[1-9][0-9]{7,14}$/)
    .required()
    .messages({
      "string.pattern.base":
        "Invalid phone number format. Use E.164 (+39333...)",
    }),
}).unknown(false);
