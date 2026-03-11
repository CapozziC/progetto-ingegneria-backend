import type { Request, Response, NextFunction } from "express";
import type { RequestAccount } from "../types/express.js";
import type { AdvertisementFilters } from "../types/advertisement.type.js";
import { Status } from "../entities/appointment.js";

/**
 * Middleware to parse specified fields in the request body as JSON.
 * This is useful when the client sends certain fields as JSON strings (e.g., from a form submission)
 * and we want to convert them into JavaScript objects before further processing.
 * The middleware iterates over the specified fields, checks if they are strings, and attempts to parse them as JSON.
 * If parsing fails for any field, a 400 Bad Request response is sent with an appropriate error message.
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
          req.body[field] = JSON.parse(v);
        } catch {
          return res.status(400).json({ error: `${field} must be valid JSON` });
        }
      }
    }
    next();
  };

/**
 * Parses a value as a positive integer.
 * @param value  The value to parse, which can be of any type. The function will attempt to convert it to a number 
 * and check if it's a positive integer.
 * @returns A positive integer if the value can be successfully parsed as such; 
 * otherwise, it returns null. This function is useful for validating query parameters 
 * or request body fields that are expected to be positive integers 
*/
export const parsePositiveInt = (value: unknown): number | null => {
  const n = Number(value);
  return Number.isInteger(n) && n > 0 ? n : null;
};

/** Parses a value as a Status enum member.
 * @param raw The value to parse, which can be of any type. The function will check if it's a string 
 * and if it matches one of the valid Status enum members.
 * @returns A Status enum member if the value is a valid string representation of a Status; 
 * returns undefined if the value is null or undefined (indicating that the field was not provided); 
 * returns null if the value is provided but is not a valid Status string. 
 * This function is useful for validating query parameters or request body fields that are expected to be of type Status.
 */
export const parseStatus = (raw: unknown): Status | undefined | null => {
  // undefined = non passato; null = passato ma invalido
  if (raw == null) return undefined;
  if (typeof raw !== "string") return null;
  return Object.values(Status).includes(raw as Status) ? (raw as Status) : null;
};

/**
 * Parses a value as a non-empty string. This function checks if the provided value is of type string and is not just whitespace.
 * If the value is a valid non-empty string, it returns the trimmed version of the string; otherwise, it returns undefined. 
 * This is useful for validating input fields that are expected to contain meaningful text. 
 * @param value The value to parse, which can be of any type. The function will check if it's a string 
 * and if it contains non-whitespace characters.
 * @returns A trimmed string if the value is a valid non-empty string; otherwise, it returns undefined. 
 * This allows the caller to easily check if a valid string was provided or not.
 */
export const parseString = (value: unknown): string | undefined => {
  return typeof value === "string" && value.trim() !== ""
    ? value.trim()
    : undefined;
};

/**
 * Parses a value as a number. This function checks if the provided value is of type string and can be converted to a finite number.
 * If the value is a valid number string, it returns the corresponding number; otherwise, it returns undefined.
 * This is useful for validating input fields that are expected to contain numeric values, such as query parameters or request body fields.
 * @param value The value to parse, which can be of any type. The function will check if it's a string and if it can be converted to a finite number.
 * @returns A number if the value is a valid number string; otherwise, it returns undefined. 
 * This allows the caller to easily check if a valid number was provided or not.
 */
export const parseNumber = (value: unknown): number | undefined => {
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
};

/**
 * Parses a boolean query parameter. This function checks if the provided value is a string and matches either "true" or "false".
 * If the value is a valid boolean string, it returns the corresponding boolean; otherwise, it returns undefined.
 * This is useful for validating input fields that are expected to contain boolean values, such as query parameters.
 * @param value The value to parse, which can be of any type. The function will check if it's a string and if it matches "true" or "false".
 * @returns A boolean if the value is a valid boolean string; otherwise, it returns undefined.
 * This allows the caller to easily check if a valid boolean was provided or not.
 */
export const parseBooleanQueryParam = (value: unknown): boolean | undefined => {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
};

/**
 * Normalizes a pagination parameter by ensuring it is a finite number greater than or equal to a specified minimum.
 * This function is useful for validating and sanitizing pagination parameters such as "take" and "skip" in query parameters.
 * If the provided value is a valid number that meets the criteria, it returns the value; otherwise, it returns a fallback value.
 * @param value The value to normalize, which can be of any type. The function will check if it's a finite number and if it's greater than or equal to the specified minimum.
 * @param fallback The fallback value to return if the provided value is not valid. This should be a number that makes sense in the context of pagination (e.g., 10 for "take" or 0 for "skip").
 * @param min The minimum acceptable value for the pagination parameter. This defaults to 0, meaning that negative numbers are not considered valid.
 * @returns The normalized pagination value if the provided value is valid; otherwise, it returns the fallback value. 
 * This allows the caller to ensure that pagination parameters are always within acceptable bounds.
 */
export const normalizePagination = (
  value: number,
  fallback: number,
  min = 0,
): number => {
  return Number.isFinite(value) && value >= min ? value : fallback;
};

/**
 * Parses advertisement filters from a request object. This function extracts various query parameters from the request and attempts to parse them into the appropriate types for filtering advertisements.
 * It uses the previously defined parsing functions to ensure that each filter parameter is correctly typed and valid. The resulting AdvertisementFilters object can then be used to query the database for advertisements that match the specified criteria.
 * @param req The request object containing the query parameters.
 * @returns The parsed advertisement filters.
 */
export const parseAdvertisementFilters = (
  req: RequestAccount,
): AdvertisementFilters => {
  return {
    take: parseNumber(req.query.take) ?? 10,
    skip: parseNumber(req.query.skip) ?? 0,
    status: parseString(req.query.status),
    type: parseString(req.query.type),
    housingType: parseString(req.query.housingType),
    city: parseString(req.query.city),
    qLat: parseNumber(req.query.lat),
    qLon: parseNumber(req.query.lon),
    radiusMeters: parseNumber(req.query.radiusMeters) ?? 200_000,
    minPrice: parseNumber(req.query.minPrice),
    maxPrice: parseNumber(req.query.maxPrice),
    minSize: parseNumber(req.query.minSize),
    maxSize: parseNumber(req.query.maxSize),
    rooms: parseNumber(req.query.rooms),
    floor: parseNumber(req.query.floor),
    bathrooms: parseNumber(req.query.bathrooms),
    elevator: parseBooleanQueryParam(req.query.elevator),
    airConditioning: parseBooleanQueryParam(req.query.airConditioning),
    heating: parseBooleanQueryParam(req.query.heating),
    concierge: parseBooleanQueryParam(req.query.concierge),
    parking: parseBooleanQueryParam(req.query.parking),
    garage: parseBooleanQueryParam(req.query.garage),
    furnished: parseBooleanQueryParam(req.query.furnished),
    solarPanels: parseBooleanQueryParam(req.query.solarPanels),
    balcony: parseBooleanQueryParam(req.query.balcony),
    terrace: parseBooleanQueryParam(req.query.terrace),
    garden: parseBooleanQueryParam(req.query.garden),
  };
};
