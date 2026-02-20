import Joi from "joi";

export const loginAgentSchema = Joi.object({
  agencyId: Joi.number().integer().positive().required(),
  username: Joi.string().trim().min(2).max(30).required(),
  password: Joi.string().trim().min(8).max(255).required(),
});

export const changePasswordAgentSchema = Joi.object({
  currentPassword: Joi.string().trim().min(8).max(255).required(),
  newPassword: Joi.string().trim().min(8).max(255).required(),
  confirmPassword: Joi.string().trim().min(8).max(255).required(),
});

export const registerAccountSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(30).required(),
  lastName: Joi.string().trim().min(2).max(30).required(),
  email: Joi.string().email().trim().required(),
  password: Joi.string().trim().min(8).max(255).required(),
});
export const loginAccountSchema = Joi.object({
  email: Joi.string().email().trim().required(),
  password: Joi.string().trim().min(8).max(255).required(),
});

export const createNewAgencyWithFirstAgentSchema = Joi.object({
  name: Joi.string().trim().min(2).max(120).required(),
  email: Joi.string()
    .trim()
    .lowercase()
    .pattern(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .required(),
  agencyPhoneNumber: Joi.string()
    .trim()
    .pattern(/^\+?[0-9\s().-]{6,25}$/)
    .required(),

  firstName: Joi.string().trim().min(1).max(80).required(),
  lastName: Joi.string().trim().min(1).max(80).required(),
  agentPhoneNumber: Joi.string()
    .trim()
    .pattern(/^\+?[0-9\s().-]{6,25}$/)
    .required(),
})
  .required()
  // blocca campi extra nel body
  .unknown(false)
  .messages({
    "object.unknown": "Field {#label} is not allowed",
  });
