import { findTakenAppointmentsForAgent } from "../repositories/appointment.repository.js";
import { AdvertisementRepository } from "../repositories/advertisement.repository.js";
import { DateTime } from "luxon";

const TZ = "Europe/Rome";

export function isValidHourlySlotRome(d: Date): boolean {
  // interpreta d come UTC (arriva da ISO o DB)
  const dt = DateTime.fromJSDate(d, { zone: "utc" }).setZone(TZ);

  const isOnTheHour =
    dt.minute === 0 && dt.second === 0 && dt.millisecond === 0;

  const inWorkingHours = dt.hour >= 9 && dt.hour < 18; // 9..17
  const isWeekend = dt.weekday === 6 || dt.weekday === 7; // 6 sab, 7 dom

  return isOnTheHour && inWorkingHours && !isWeekend;
}


function generateHourlySlotsRome(fromUTC: Date, toUTC: Date): Date[] {
  const fromRome = DateTime.fromJSDate(fromUTC, { zone: "utc" }).setZone(TZ);
  const toRome = DateTime.fromJSDate(toUTC, { zone: "utc" }).setZone(TZ);

  // arrotonda all'ora successiva (in Rome)
  let cur = fromRome.startOf("hour");
  if (cur < fromRome) cur = cur.plus({ hours: 1 });

  const slots: Date[] = [];

  while (cur < toRome) {
    const isWeekend = cur.weekday === 6 || cur.weekday === 7; // 6 sab, 7 dom
    const inWorkingHours = cur.hour >= 9 && cur.hour < 18;    // 9..17

    if (!isWeekend && inWorkingHours) {
      // salva in UTC per coerenza DB
      slots.push(cur.toUTC().toJSDate());
    }

    cur = cur.plus({ hours: 1 });
  }

  return slots;
}
export async function getAvailableSlotsForAdvertisement(
  advertisementId: number,
  from: Date,
  to: Date,
): Promise<Date[]> {
  const adv = await AdvertisementRepository.findOne({
    where: { id: advertisementId },
    relations: { agent: true },
    select: { id: true, agent: { id: true } },
  });
  if (!adv?.agent?.id) return [];

  const agentId = adv.agent.id;

  // ✅ griglia Rome-safe (ritorna Date in UTC)
  const allSlots = generateHourlySlotsRome(from, to);

  // ✅ appuntamenti presi nel DB tra from/to (UTC)
  const taken = await findTakenAppointmentsForAgent(agentId, from, to);

  // key in UTC (ok)
  const takenSet = new Set(taken.map(toKey));

  return allSlots.filter((s) => !takenSet.has(toKey(s)));
}
function toKey(d: Date): string {
  return d.toISOString();
}
