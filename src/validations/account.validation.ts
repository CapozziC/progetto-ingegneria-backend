import Joi from "joi";
export const deleteAccountSchema = Joi.object({
  accountId: Joi.number().integer().positive().required().messages({
    "number.base": "Account ID must be a number",
    "number.integer": "Account ID must be an integer",
    "number.positive": "Account ID must be positive",
    "any.required": "Account ID is required",
  }),
});

export const updatePasswordSchema = Joi.object({
  newPassword: Joi.string().min(8).max(128).required().messages({
    "string.base": "New password must be a string", 
    "string.min": "New password must be at least 8 characters long",
    "string.max": "New password cannot be longer than 128 characters",
    "any.required": "New password is required",
  }),
}).unknown(false);