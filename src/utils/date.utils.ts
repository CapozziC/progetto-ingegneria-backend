/**
 * Parses a string into a Date object if it's a valid ISO date string, otherwise returns null.
 * @param value The value to parse as a date, expected to be an ISO date string
 * @returns A Date object if the input is a valid ISO date string, or null if the input is not a valid date
 */
export function parseISODate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Checks if a given value is a valid Date object.
 * @param value The value to check for validity as a Date object  
 * @returns True if the value is a valid Date object, false otherwise
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Checks if a given value is a valid ISO date string.
 * @param value The value to check for validity as an ISO date string
 * @returns True if the value is a valid ISO date string, false otherwise
 */
export function isValidISODateString(value: unknown): boolean {
  return parseISODate(value) !== null;
}

/**
 *  Returns a new Date object representing the start of the day (00:00:00) for the given date.
 * @param d The date for which to calculate the start of the day
 * @returns A new Date object representing the start of the day for the given date
 */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Returns a new Date object representing the end of the day (23:59:59.999) for the given date.
 * @param d The date for which to calculate the end of the day
 * @returns A new Date object representing the end of the day for the given date
 */
export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
