import Joi from "joi";
export const deleteAccountSchema = Joi.object({
  params: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
      .messages({
        "number.base": "Account ID must be a number",
        "number.integer": "Account ID must be an integer",
        "number.positive": "Account ID must be positive",
        "any.required": "Account ID is required",
      }),
  }),
});