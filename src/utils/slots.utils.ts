import { findTakenAppointmentsForAgent } from "../repositories/appointment.repository.js";
import { AdvertisementRepository } from "../repositories/advertisement.repository.js";

function toKey(d: Date): string {
  return d.toISOString(); // key unica
}

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
