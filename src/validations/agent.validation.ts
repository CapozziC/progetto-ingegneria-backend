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


export const updatePasswordAgentParamsSchema = Joi.object({
  agentId: Joi.number().integer().positive().required().messages({
    "number.base": "Agent ID must be a number",
    "number.integer": "Agent ID must be an integer",
    "number.positive": "Agent ID must be positive",
    "any.required": "Agent ID is required",
  }),
});

export const updatePasswordAgentBodySchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    "string.base": "Current password must be a string",
    "any.required": "Current password is required",
  }),
  newPassword: Joi.string().min(8).max(100).required().messages({
    "string.base": "New password must be a string",
    "string.min": "New password must be at least 8 characters long",
    "string.max": "New password cannot be longer than 100 characters",
    "any.required": "New password is required",
  }),
  confirmPassword: Joi.string().required().messages({
    "string.base": "Confirm password must be a string",
    "any.required": "Confirm password is required",
  }),
}).unknown(false);


