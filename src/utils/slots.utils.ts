import { findTakenAppointmentsForAgent } from "../repositories/appointment.repository.js";
import { AdvertisementRepository } from "../repositories/advertisement.repository.js";

/**
 * Converts a Date object to a string key for use in sets or maps. This function is used to create a unique identifier for each appointment slot based on its date and time, allowing for efficient comparison and filtering of available slots against taken appointments.
 * @param d The Date object representing the appointment slot to convert
 * @returns A string key in ISO format representing the date and time of the appointment slot
 */
function toKey(d: Date): string {
  return d.toISOString(); // key unica
}
/**
 * Generates a list of available hourly slots for appointments based on the specified date range. The function creates a grid of potential appointment times, typically on an hourly basis, and then filters out the slots that are already taken by existing appointments. The resulting list of available slots can be used to display options to users when scheduling new appointments.
 * @param from The start date and time of the range for which to generate available slots
 * @param to The end date and time of the range for which to generate available slots
 * @returns An array of Date objects representing the available hourly slots for appointments within the specified date range
 */
function generateHourlySlots(from: Date, to: Date): Date[] {
  const slots: Date[] = [];
  const cur = new Date(from);

  // arrotonda al prossimo “:00”
  cur.setMinutes(0, 0, 0);

  while (cur < to) {
    const hour = cur.getHours();
    const day = cur.getDay(); // 0 dom, 6 sab

    const isWeekend = day === 0 || day === 6;
    const inWorkingHours = hour >= 9 && hour < 18;

    if (!isWeekend && inWorkingHours) {
      slots.push(new Date(cur));
    }
    cur.setHours(cur.getHours() + 1);
  }

  return slots;
}

/**
 * Get available appointment slots for a specific advertisement within a given date range. This function retrieves the advertisement to identify the associated agent, generates a grid of potential hourly slots within the specified date range, and then filters out the slots that are already taken by existing appointments for that agent. The resulting list of available slots can be used to display options to users when scheduling new appointments for the advertisement.
 * @param advertisementId The unique identifier of the advertisement for which to get available appointment slots
 * @param from  The start date and time of the range for which to get available slots
 * @param to The end date and time of the range for which to get available slots
 * @returns An array of Date objects representing the available appointment slots for the specified advertisement within the given date range
 */
export async function getAvailableSlotsForAdvertisement(
  advertisementId: number,
  from: Date,
  to: Date,
): Promise<Date[]> {
  // 1) prendi l’annuncio e scopri l’agent “owner”
  const adv = await AdvertisementRepository.findOne({
    where: { id: advertisementId },
    relations: { agent: true },
    select: { id: true, agent: { id: true } },
  });
  if (!adv?.agent?.id) return [];

  const agentId = adv.agent.id;

  // 2) genera griglia
  const allSlots = generateHourlySlots(from, to);

  // 3) prendi slot occupati dal DB
  const taken = await findTakenAppointmentsForAgent(agentId, from, to);
  const takenSet = new Set(taken.map(toKey));

  // 4) differenza
  return allSlots.filter((s) => !takenSet.has(toKey(s)));
}
export function isValidHourlySlot(d: Date): boolean {
  if (
    d.getMinutes() !== 0 ||
    d.getSeconds() !== 0 ||
    d.getMilliseconds() !== 0
  ) {
    return false;
  }

  const hour = d.getHours();
  const inWorkingHours = hour >= 9 && hour < 18;

  const day = d.getDay(); // 0 dom, 6 sab
  const isWeekend = day === 0 || day === 6;

  return inWorkingHours && !isWeekend;
}
