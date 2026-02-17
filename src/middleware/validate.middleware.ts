import type { Request, Response, NextFunction } from "express";
import type Joi from "joi";

/**
 * Middleware to validate the request body against a Joi schema.
 * If the validation fails, a 400 Bad Request response is sent with details about the validation errors.
 * If the validation succeeds, the validated and sanitized data is assigned back to req.body and the next middleware or route handler is called.
 * @param schema A Joi object schema to validate the request body against
 * @returns An Express middleware function
 */
export const validateBody =
  (schema: Joi.ObjectSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      const { value, error } = schema.validate(req.body, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
      });

      if (error) {
        return res.status(400).json({
          error: "Validation error",
          details: error.details.map((d) => d.message),
        });
      }

      req.body = value;
      next();
    };

/**
 * Middleware to validate the request query parameters against a Joi schema.
 * If the validation fails, a 400 Bad Request response is sent with details about the validation errors.
 * If the validation succeeds, the validated and sanitized data is assigned back to req.query and the next middleware or route handler is called.
 * @param schema A Joi object schema to validate the request query parameters against
 * @returns An Express middleware function
 */
export const validateParams =
  (schema: Joi.ObjectSchema) =>
    (req: Request, res: Response, next: NextFunction) => {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        convert: true, // converte string -> number se necessario
        stripUnknown: true, // rimuove parametri extra
      });

      if (error) {
        return res.status(400).json({
          error: "Invalid route parameters",
          details: error.details.map((d) => d.message),
        });
      }

      req.params = value; // sostituisce con valori validati/convertiti
      next();
    };
