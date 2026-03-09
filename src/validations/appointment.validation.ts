import Joi from "joi";

export const AppointmentParamsSchema = Joi.object({
  id: Joi.number().integer().positive().required().messages({
    "number.base": "Appointment id must be a number",
    "number.integer": "Appointment id must be an integer",
    "number.positive": "Appointment id must be positive",
    "any.required": "Appointment id is required",
  }),
});
