import type { Request, Response, NextFunction } from "express";

/**
 * Middleware to parse specified fields in the request body as JSON. This is useful when the client sends certain fields as JSON strings (e.g., from a form submission) and we want to convert them into JavaScript objects before further processing. The middleware iterates over the specified fields, checks if they are strings, and attempts to parse them as JSON. If parsing fails for any field, a 400 Bad Request response is sent with an appropriate error message.
 * @param fields An array of field names in the request body that should be parsed as JSON
 * @returns An Express middleware function that parses the specified fields in the request body as JSON
 * @throws A 400 Bad Request response if any of the specified fields cannot be parsed as valid JSON
 */
export const parseJsonFields =
  (fields: string[]) => (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const v = req.body?.[field];
      if (typeof v === "string") {
        try {
          (req.body)[field] = JSON.parse(v);
        } catch {
          return res.status(400).json({ error: `${field} must be valid JSON` });
        }
      }
    }
    next();
  };
