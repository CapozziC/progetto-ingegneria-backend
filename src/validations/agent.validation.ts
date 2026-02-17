import Joi from "joi";

export const createAgentSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(30).required(),
  lastName: Joi.string().trim().min(2).max(30).required(),
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^\+[1-9][0-9]{7,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid phone number format. Use E.164 (+39333...)",
    }),
  isAdmin: Joi.boolean().default(false),
}).unknown(false);

export const deleteAgentParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required(),
}).unknown(false);

export const updatePhoneNumberSchema = Joi.object({
  phoneNumber: Joi.string()
    .trim()
    .pattern(/^\+[1-9][0-9]{7,14}$/)
    .required()
    .messages({
      "string.pattern.base": "Invalid phone number format. Use E.164 (+39333...)",
    }),
}).unknown(false);
