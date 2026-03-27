import { DateTime } from "luxon";
const TZ = "Europe/Rome";
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
  return value instanceof Date && !Number.isNaN(value.getTime());
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
 * Ritorna oggi in Europe/Rome alle 00:00
 */
export function todayRome(): DateTime {
  return DateTime.now().setZone(TZ).startOf("day");
}

/**
 * Converte Date (UTC dal DB) in chiave YYYY-MM-DD Europe/Rome
 */
export function dayKeyRome(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "utc" })
    .setZone(TZ)
    .toFormat("yyyy-LL-dd");
}

/**
 * Converte Date in HH:mm Europe/Rome
 */
export function hhmmRome(d: Date): string {
  return DateTime.fromJSDate(d, { zone: "utc" }).setZone(TZ).toFormat("HH:mm");
}

export function toHoursByDayRome(
  slots: Date[],
): Array<{ day: string; hours: string[] }> {
  const map = new Map<string, string[]>();

  for (const s of slots) {
    const day = dayKeyRome(s);
    const hour = hhmmRome(s);

    const prev = map.get(day) ?? [];
    map.set(day, [...prev, hour]);
  }

  return Array.from(map.entries()).map(([day, hours]) => ({
    day,
    hours,
  }));
}
