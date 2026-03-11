import type { Request } from "express";
/**
 * Normalizes an IP address by removing the "::ffff:" prefix if present, which is used to represent IPv4-mapped IPv6 addresses. 
 * The function also trims any leading or trailing whitespace from the IP address string. 
 * This normalization is useful for ensuring that IP addresses are in a consistent format, 
 * especially when dealing with both IPv4 and IPv6 addresses in applications that may receive client IPs in different formats.
 * @param ip - The IP address string to be normalized. This can be an IPv4-mapped IPv6 address (e.g., "::ffff:
 * @returns The normalized IP address string. If the input IP address starts with "::ffff:", the prefix is removed.
 *  Otherwise, the original IP address is returned after trimming whitespace.
 */
export function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) return ip.slice(7);
  return ip.trim();
}

/** Retrieves the client's IP address from an Express request object. The function checks various headers and properties to determine the client's IP, including "cf-connecting-ip" for Cloudflare, "x-forwarded-for" for proxies, and the standard "req.ip" property. It returns the client's IP address as a string or null if it cannot be determined. This function is useful for applications that need to log or use the client's IP address for geolocation, rate limiting, or other purposes.
 * @param req - The Express request object from which to extract the client's IP address.
 * @returns The client's IP address as a string, or null if it cannot be determined.
 */
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
