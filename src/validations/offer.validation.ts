import Joi from "joi";
export const OfferParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Offer id must be a number",
    "number.integer": "Offer id must be an integer",
    "number.positive": "Offer id must be positive",
    "any.required": "Offer id is required",
  }),
});

export const counterOfferParamsSchema = Joi.object({
  advertisementId: Joi.number().integer().positive().required().messages({
    "number.base": "Advertisement id must be a number",
    "number.integer": "Advertisement id must be an integer",
    "number.positive": "Advertisement id must be positive",
    "any.required": "Advertisement id is required",
  }),

  accountId: Joi.number().integer().positive().required().messages({
    "number.base": "Account id must be a number",
    "number.integer": "Account id must be an integer",
    "number.positive": "Account id must be positive",
    "any.required": "Account id is required",
  }),
});

export const AccountCounterOfferParamsSchema = Joi.object({
  advertisementId: Joi.number().integer().positive().required().messages({
    "number.base": "Advertisement id must be a number",
    "number.integer": "Advertisement id must be an integer",
    "number.positive": "Advertisement id must be positive",
    "any.required": "Advertisement id is required",
  }),
});

export const counterOfferBodySchema = Joi.object({
  price: Joi.number().positive().required().messages({
    "number.base": "Price must be a number",
    "number.positive": "Price must be greater than 0",
    "any.required": "Price is required",
  }),
});
