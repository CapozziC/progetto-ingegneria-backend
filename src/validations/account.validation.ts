import Joi from "joi";
export const deleteAccountSchema = Joi.object({
  accountId: Joi.number().integer().positive().required().messages({
    "number.base": "Account ID must be a number",
    "number.integer": "Account ID must be an integer",
    "number.positive": "Account ID must be positive",
    "any.required": "Account ID is required",
  }),
});

export const updatePasswordParamsSchema = Joi.object({
  accountId: Joi.number().integer().positive().required().messages({
    "number.base": "Account ID must be a number",
    "number.integer": "Account ID must be an integer",
    "number.positive": "Account ID must be positive",
    "any.required": "Account ID is required",
  }),
});

export const updatePasswordBodySchema = Joi.object({
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