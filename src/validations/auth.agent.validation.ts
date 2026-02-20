import joi from "joi";

export const loginAgentSchema = joi.object({
  agencyId: joi.number().integer().positive().required(),
  username: joi.string().trim().min(2).max(30).required(),
  password: joi.string().trim().min(8).max(255).required(),
});

export const changePasswordAgentSchema = joi.object({
  currentPassword: joi.string().trim().min(8).max(255).required(),
  newPassword: joi.string().trim().min(8).max(255).required(),
  confirmPassword: joi.string().trim().min(8).max(255).required(),
});
