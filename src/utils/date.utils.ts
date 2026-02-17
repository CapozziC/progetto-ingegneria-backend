/**
 * Parses a string into a Date object if it's a valid ISO date string, otherwise returns null.
 * @param value
 * @returns
 */
export function parseISODate(value: unknown): Date | null {
  if (typeof value !== "string") return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Checks if a given value is a valid Date object.
 * @param value
 * @returns
 */
export function isValidDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Checks if a given value is a valid ISO date string.
 * @param value
 * @returns
 */
export function isValidISODateString(value: unknown): boolean {
  return parseISODate(value) !== null;
}
/**
 *  Returns a new Date object representing the start of the day (00:00:00) for the given date.
 * @param d
 * @returns
 */
export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
/** Returns a new Date object representing the end of the day (23:59:59.999) for the given date.
 * @param d
 * @returns
 */

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}
