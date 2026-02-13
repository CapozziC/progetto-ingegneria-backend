import type { Request, Response, NextFunction } from "express";

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
