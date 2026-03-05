import type { Request } from "express";

export function getClientIp(req: Request): string | null {
  const cfIp = req.headers["cf-connecting-ip"];
  if (typeof cfIp === "string") {
    return cfIp;
  }

  const forwarded = req.headers["x-forwarded-for"];

  if (typeof forwarded === "string") {
    const ip = forwarded.split(",")[0];
    if (ip) {
      return ip.trim();
    }
  }

  if (req.ip) {
    return req.ip;
  }

  return null;
}

export function normalizeIp(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}
