import { Response } from "express";
import { parseISODate, startOfDay, endOfDay } from "../utils/date.utils.js";
import { getAvailableSlotsForAdvertisement } from "../utils/slots.utils.js";
import { RequestAccount, RequestAgent } from "../types/express.js";
import {
  findAppointmentByIdForAgent,
  findAppointmentsByAgentId,
  saveAppointment,
  findAppointmentsByAccount,
  findAppointmentByIdForAccount,
} from "../repositories/appointment.repository.js";
import { Appointment, Status } from "../entities/appointment.js";
import { findAdvertisementOwnerId } from "../repositories/advertisement.repository.js";
import { isValidHourlySlot } from "../utils/slots.utils.js";
import { QueryFailedError } from "typeorm";
/**
 * Dato un oggetto Date, restituisce una stringa "YYYY-MM-DD" da usare come chiave per raggruppare gli slot per giorno
 * @param d
 * @returns
 */
function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

/**
 * Controlla se l'errore è un vincolo di unicità violato da Postgres (es. slot già preso)
 * @param err
 * @returns
 *
 */
function isPgUniqueViolation(err: unknown): boolean {
  // Postgres unique violation: 23505
  return (
    err instanceof QueryFailedError &&
    typeof err.driverError?.code === "string" &&
    err.driverError.code === "23505"
  );
}

/**
 * Restituisce gli appuntamenti dell'account autenticato, eventualmente filtrati per status e range di date
 * I parametri di query 'from' e 'to' devono essere stringhe ISO (es. 2024-07-01T00:00:00.000Z)
 * Il parametro di query 'status' deve essere uno dei valori dell'enum Status
 * @param req
 * @param res
 * @returns
 */
export const getAvailableDays = async (req: RequestAccount, res: Response) => {
  try {
    const account = req.account;
    if (!account) {
      return res
        .status(401)
        .json({ error: "Unauthorized: account not logged in" });
    }
    const advertisementId = Number(req.params.id);
    if (!Number.isFinite(advertisementId) || advertisementId <= 0) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const from = parseISODate(req.query.from) ?? new Date();
    const to =
      parseISODate(req.query.to) ??
      new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

    if (from >= to) {
      return res.status(400).json({ error: "Invalid date range" });
    }

    const slots = await getAvailableSlotsForAdvertisement(
      advertisementId,
      from,
      to,
    );

    // raggruppa per giorno (per la tua UI)
    const map = new Map<string, string[]>();
    for (const s of slots) {
      const key = dayKey(s);
      const hhmm = s.toISOString().slice(11, 16); // "HH:MM" (ISO in UTC)
      map.set(key, [...(map.get(key) ?? []), hhmm]);
    }

    return res.json({
      advertisementId,
      from: from.toISOString(),
      to: to.toISOString(),
      days: Array.from(map.entries()).map(([day, hours]) => ({ day, hours })),
    });
  } catch (e) {
    console.error("getAvailableDays error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 *  Crea un appuntamento per l'account autenticato, per l'advertisement specificato e lo slot specificato
 *  Lo slot deve essere un'ora intera (es. 14:00) e deve essere disponibile (non già prenotato da altri)
 *  Se lo slot è già prenotato, restituisce un errore 409 (Conflict)
 *  Se l'advertisement non esiste, restituisce un errore 404 (Not Found)
 *  Se la data dello slot è passata o non è un'ora intera valida, restituisce un errore 400 (Bad Request)
 * @param req
 * @param res
 * @returns
 */

export const getAvailableSlotsByDay = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const account = req.account;
    if (!account) {
      return res
        .status(401)
        .json({ error: "Unauthorized: account not logged in" });
    }
    const advertisementId = Number(req.params.id);
    const day = typeof req.query.day === "string" ? req.query.day : null;
    if (!advertisementId || advertisementId <= 0 || !day) {
      return res
        .status(400)
        .json({ error: "advertisementId and day are required" });
    }

    const d = parseISODate(day);
    if (!d)
      return res.status(400).json({ error: "Invalid day format (use ISO)" });

    const from = startOfDay(d);
    const to = endOfDay(d);

    const slots = await getAvailableSlotsForAdvertisement(
      advertisementId,
      from,
      to,
    );

    return res.json({
      advertisementId,
      day: dayKey(d),
      slots: slots.map((x) => x.toISOString()),
    });
  } catch (e) {
    console.error("getAvailableSlotsByDay error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 *  Crea un appuntamento per l'account autenticato, per l'advertisement specificato e lo slot specificato
 * @param req
 * @param res
 * @return
 * */

export const createAppointment = async (req: RequestAccount, res: Response) => {
  try {
    const account = req.account;
    if (!account) {
      return res
        .status(401)
        .json({ error: "Unauthorized: account not logged in" });
    }

    const advertisementId = Number(req.params.id);
    if (!Number.isFinite(advertisementId) || advertisementId <= 0) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const appointmentAt = parseISODate(req.body?.appointmentAt);
    if (!appointmentAt) {
      return res.status(400).json({
        error: "appointmentAt must be a valid ISO date string",
      });
    }

    if (!isValidHourlySlot(appointmentAt)) {
      return res.status(400).json({
        error: "Invalid slot (must be a valid working-hour hourly slot)",
      });
    }

    if (appointmentAt.getTime() <= Date.now()) {
      return res.status(400).json({
        error: "appointmentAt must be in the future",
      });
    }

    const agentId = await findAdvertisementOwnerId(advertisementId);
    if (!agentId) {
      return res.status(404).json({ error: "Advertisement not found" });
    }

    const appointment = new Appointment();
    appointment.status = Status.REQUESTED;
    appointment.appointmentAt = appointmentAt;
    appointment.agentId = agentId;
    appointment.accountId = account.id;
    appointment.advertisementId = advertisementId;

    // Salvataggio: se lo slot è già preso scatta il vincolo
    const saved = await saveAppointment(appointment);

    return res.status(201).json({
      message: "Appointment requested successfully",
      appointmentId: saved.id,
      status: saved.status,
      appointmentAt: saved.appointmentAt.toISOString(),
      advertisementId,
      agentId,
      accountId: account.id,
    });
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      return res.status(409).json({ error: "Slot already taken" });
    }
    console.error("createAppointment error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 *  Restituisce gli appuntamenti dell'agente autenticato, eventualmente filtrati per status e range di date
 * @param req
 * @param res
 * @returns
 */

export const getAppointmentsForAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const { status, from, to } = req.query;
    const agent = req.agent;
    if (!agent) {
      return res
        .status(401)
        .json({ error: "Unauthorized: agent not logged in" });
    }

    let parsedStatus: Status | undefined;
    if (typeof status === "string") {
      if (!Object.values(Status).includes(status as Status)) {
        return res.status(400).json({
          error: "Invalid status value",
        });
      }
      parsedStatus = status as Status;
    }

    let parsedFrom: Date | undefined;
    let parsedTo: Date | undefined;

    if (typeof from === "string" && typeof to === "string") {
      const f = new Date(from);
      const t = new Date(to);

      if (isNaN(f.getTime()) || isNaN(t.getTime()) || f >= t) {
        return res.status(400).json({
          error: "Invalid date range",
        });
      }
      parsedFrom = f;
      parsedTo = t;
    }

    const appointments = await findAppointmentsByAgentId(agent.id, {
      status: parsedStatus,
      from: parsedFrom,
      to: parsedTo,
    });

    return res.json({
      agentId: agent.id,
      appointments: appointments.map((a) => ({
        appointmentId: a.id,
        status: a.status,
        appointmentAt: a.appointmentAt.toISOString(),
        advertisementId: a.advertisementId,
        accountId: a.accountId,
      })),
    });
  } catch (e) {
    console.error("getAppointmentsForAgent error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 *  L'agente conferma un appuntamento richiesto, cambiandone lo status in 'CONFIRMED'
 *  Restituisce un errore 400 se l'appuntamento non è in stato 'REQUESTED'
 *  Restituisce un errore 404 se l'appuntamento non esiste o non appartiene all'agente
 * @param req
 * @param res
 * @returns
 */

export const agentConfirmAppointment = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const appointmentId = Number(req.params.id);
    const agent = req.agent;
    if (!agent) {
      return res
        .status(401)
        .json({ error: "Unauthorized: agent not logged in" });
    }

    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: "Invalid appointment id" });
    }

    const appointment = await findAppointmentByIdForAgent(
      appointmentId,
      agent.id,
    );
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (appointment.status !== Status.REQUESTED) {
      return res
        .status(400)
        .json({ error: "Only requested appointments can be confirmed" });
    }

    appointment.status = Status.CONFIRMED;
    await saveAppointment(appointment);

    return res.json({
      message: "Appointment confirmed successfully",
      appointmentId: appointment.id,
      status: appointment.status,
      appointmentAt: appointment.appointmentAt.toISOString(),
      advertisementId: appointment.advertisementId,
      accountId: appointment.accountId,
    });
  } catch (e) {
    console.error("agentConfirmAppointment error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * L'agente rifiuta un appuntamento richiesto, cambiandone lo status in 'REJECTED'
 * Restituisce un errore 400 se l'appuntamento non è in stato 'REQUESTED'
 * Restituisce un errore 404 se l'appuntamento non esiste o non appartiene all'agente
 * @param req
 * @param res
 * @returns
 */

export const agentRejectAppointment = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const appointmentId = Number(req.params.id);
    const agent = req.agent;
    if (!agent) {
      return res
        .status(401)
        .json({ error: "Unauthorized: agent not logged in" });
    }

    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({ error: "Invalid appointment id" });
    }

    const appointment = await findAppointmentByIdForAgent(
      appointmentId,
      agent.id,
    );
    if (!appointment) {
      return res.status(404).json({ error: "Appointment not found" });
    }

    if (appointment.status !== Status.REQUESTED) {
      return res
        .status(400)
        .json({ error: "Only requested appointments can be rejected" });
    }

    appointment.status = Status.REJECTED;
    await saveAppointment(appointment);

    return res.json({
      message: "Appointment rejected successfully",
      appointmentId: appointment.id,
      status: appointment.status,
      appointmentAt: appointment.appointmentAt.toISOString(),
      advertisementId: appointment.advertisementId,
      accountId: appointment.accountId,
    });
  } catch (e) {
    console.error("agentRejectAppointment error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 *  Restituisce gli appuntamenti dell'account autenticato, eventualmente filtrati per status e range di date
 * I parametri di query 'from' e 'to' devono essere stringhe ISO (es. 2024-07-01T00:00:00.000Z)
 * Il parametro di query 'status' deve essere uno dei valori dell'enum Status
 * @param req
 * @param res
 * @returns
 */
export const getAppointmentsForAccount = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const { status, from, to } = req.query;
    const account = req.account;
    if (!account) {
      return res
        .status(401)
        .json({ error: "Unauthorized: account not logged in" });
    }
    let parsedStatus: Status | undefined;
    if (typeof status === "string") {
      if (!Object.values(Status).includes(status as Status)) {
        return res.status(400).json({
          error: "Invalid status value",
        });
      }
      parsedStatus = status as Status;
    }

    const parsedFrom = from ? new Date(from as string) : undefined;
    const parsedTo = to ? new Date(to as string) : undefined;

    const appointments = await findAppointmentsByAccount(account.id, {
      status: parsedStatus,
      from: parsedFrom,
      to: parsedTo,
    });

    return res.json({
      accountId: account.id,
      appointments: appointments.map((a) => ({
        appointmentId: a.id,
        status: a.status,
        appointmentAt: a.appointmentAt.toISOString(),
        advertisementId: a.advertisementId,
        agentId: a.agentId,
      })),
    });
  } catch (e) {
    console.error("getAppointmentsForAccount error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};
/** *  L'account cancella un appuntamento richiesto o confermato, cambiandone lo status in 'CANCELLED'
 *  Restituisce un errore 400 se l'appuntamento non è in stato 'REQUESTED' o 'CONFIRMED'
 *  Restituisce un errore 404 se l'appuntamento non esiste o non appartiene all'account
 * @param req
 * @param res
 * @returns
 */
export const accountCancelAppointment = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const account = req.account;
    if (!account) {
      return res.status(401).json({
        error: "Unauthorized: account not logged in",
      });
    }

    const appointmentId = Number(req.params.id);
    if (!Number.isFinite(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        error: "Invalid appointment id",
      });
    }

    const appointment = await findAppointmentByIdForAccount(
      appointmentId,
      account.id,
    );

    if (!appointment) {
      return res.status(404).json({
        error: "Appointment not found or not owned by this account",
      });
    }

    // Regola business
    if (
      appointment.status !== Status.REQUESTED &&
      appointment.status !== Status.CONFIRMED
    ) {
      return res.status(409).json({
        error: `Cannot cancel appointment in status '${appointment.status}'`,
      });
    }

    appointment.status = Status.CANCELLED;
    const saved = await saveAppointment(appointment);

    return res.status(200).json({
      message: "Appointment cancelled successfully",
      appointmentId: saved.id,
      status: saved.status,
      appointmentAt: saved.appointmentAt.toISOString(),
    });
  } catch (err) {
    console.error("cancelAppointment error:", err);
    return res.status(500).json({
      error: "Internal server error",
    });
  }
};
