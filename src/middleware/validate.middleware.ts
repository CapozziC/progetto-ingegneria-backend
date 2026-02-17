import type { Request, Response, NextFunction } from "express";
import type Joi from "joi";

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
