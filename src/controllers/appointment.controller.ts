import { Response } from "express";
import {
  parseISODate,
  startOfDay,
  endOfDay,
  dayKey,
  toHoursByDay,
} from "../utils/date.utils.js";
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
import { requireAccount, requireAgent } from "../utils/require.utils.js";
import { parsePositiveInt, parseStatus } from "../utils/objectParse.utils.js";

/**
 * Control if the error is a Postgres unique violation error (code 23505), which indicates that the appointment slot is already taken
 * @param err The error to check
 * @returns true if the error is a Postgres unique violation, false otherwise
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
 * Get the available days for appointments for a given advertisement and date range
 * The query parameters 'from' and 'to' must be ISO strings (e.g. 2024-07-01T00:00:00.000Z)
 * Returns a list of days with their available hours
 * @param req  RequestAccount with authenticated account in req.account and advertisement id in req.params.id
 * @param res Response with list of available days and hours for the specified advertisement and date range or error message
 * @returns  JSON with list of available days and hours for the specified advertisement and date range or error message
 */
export const getAvailableDays = async (req: RequestAccount, res: Response) => {
  try {
    const account = requireAccount(req, res);
    if (!account) return;
    const advertisementId = parsePositiveInt(req.params.id);
    if (!advertisementId) {
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

    return res.json({
      advertisementId,
      from: from.toISOString(),
      to: to.toISOString(),
      days: toHoursByDay(slots),
    });
  } catch (e) {
    console.error("getAvailableDays error:", e);
    return res.status(500).json({ error: "Internal server error" });
  }
};

/**
 * Get the available slots for the specified advertisement and day
 * The query parameter 'day' must be an ISO string (e.g. 2024-07-01)
 * Returns a list of available slots in ISO format (e.g. 2024-07-01T14:00:00.000Z)
 * @param req RequestAccount with authenticated account in req.account, advertisement id in req.params.id and day in req.query.day
 * @param res Response with list of available slots for the specified advertisement and day or error message
 * @returns JSON with list of available slots for the specified advertisement and day or error message
 */

export const getAvailableSlotsByDay = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const advertisementId = parsePositiveInt(req.params.id);
    if (!advertisementId) {
      return res.status(400).json({ error: "Invalid advertisement id" });
    }

    const day = typeof req.query.day === "string" ? req.query.day : null;

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
 * The account creates an appointment for the specified advertisement and slot
 * The slot must be a whole hour (e.g. 14:00) and must be available (not already booked by others)
 * If the slot is already booked, returns a 409 (Conflict) error
 * If the advertisement does not exist, returns a 404 (Not Found) error
 * If the date of the slot is in the past or is not a valid whole hour, returns a 400 (Bad Request) error
 * @param req RequestAccount with authenticated account in req.account, advertisement id in req.params.id and appointmentAt (ISO string) in req.body.appointmentAt
 * @param res Response with success message and appointment details or error message
 * @returns JSON with success message and appointment details or error message
 */

export const createAppointment = async (req: RequestAccount, res: Response) => {
  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const advertisementId = parsePositiveInt(req.params.id);
    if (!advertisementId) {
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
 * Return the appointments of the authenticated agent, optionally filtered by status and date range
 * The query parameters 'from' and 'to' must be ISO strings (e.g. 2024-07-01T00:00:00.000Z)
 * The query parameter 'status' must be one of the values of the Status enum
 * @param req RequestAgent with authenticated agent in req.agent and optional query parameters status, from and to for filtering the appointments
 * @param res Response with list of appointments of the authenticated agent matching the filters or error message
 * @returns JSON with list of appointments of the authenticated agent matching the filters or error message
 */

export const getAppointmentsForAgent = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const { status, from, to } = req.query;
    const agent = requireAgent(req, res);
    if (!agent) return;

    const parsedStatus = parseStatus(status);
    if (status !== undefined && parsedStatus === null) {
      return res.status(400).json({
        error: "Invalid status value",
      });
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
      status: parsedStatus ?? undefined,
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
 *The agent confirms a requested appointment, changing its status to 'CONFIRMED'
 *Returns a 400 error if the appointment is not in 'REQUESTED' status
 *Returns a 404 error if the appointment does not exist or does not belong to the agent
 *@param req RequestAgent with authenticated agent in req.agent and appointment id in req.params.id
 *@param res Response with success message and appointment details or error message
 *@returns JSON with success message and appointment details or error message
 */
export const agentConfirmAppointment = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const appointmentId = parsePositiveInt(req.params.id);
    const agent = requireAgent(req, res);
    if (!agent) return;

    if (!appointmentId) {
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
 *Agent refuses an appointment requested, changing its status to 'REJECTED'
 *Returns a 400 error if the appointment is not in 'REQUESTED' status
 *Returns a 404 error if the appointment does not exist or does not belong to the agent
 *@param req RequestAgent with authenticated agent in req.agent and appointment id in req.params.id
 *@param res Response with success message and appointment details or error message
 *@returns JSON with success message and appointment details or error message
 */
export const agentRejectAppointment = async (
  req: RequestAgent,
  res: Response,
) => {
  try {
    const appointmentId = parsePositiveInt(req.params.id);
    const agent = requireAgent(req, res);
    if (!agent) return;

    if (!appointmentId) {
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
 *Return the appointments of the authenticated account, optionally filtered by status and date range
 *The query parameters 'from' and 'to' must be ISO strings (e.g. 2024-07-01T00:00:00.000Z)
 *The query parameter 'status' must be one of the values of the Status enum
 * @param req RequestAccount with authenticated account in req.account and optional query parameters status, from and to for filtering the appointments
 * @param res Response with list of appointments of the authenticated account matching the filters or error message
 * @returns JSON with list of appointments of the authenticated account matching the filters or error message
 */
export const getAppointmentsForAccount = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const { status, from, to } = req.query;
    const account = requireAccount(req, res);
    if (!account) return;
    const parsedStatus = parseStatus(status);

    const parsedFrom = from ? new Date(from as string) : undefined;
    const parsedTo = to ? new Date(to as string) : undefined;

    const appointments = await findAppointmentsByAccount(account.id, {
      status: parsedStatus ?? undefined,
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

/**
 * The account cancels an appointment, changing its status to 'CANCELLED'
 * Returns a 400 error if the appointment is not in 'REQUESTED' or 'CONFIRMED' status
 * Returns a 404 error if the appointment does not exist or does not belong to the account
 * @param req RequestAccount with authenticated account in req.account and appointment id in req.params.id
 * @param res Response with success message and appointment details or error message
 * @returns JSON with success message and appointment details or error message
 */
export const accountCancelAppointment = async (
  req: RequestAccount,
  res: Response,
) => {
  try {
    const account = requireAccount(req, res);
    if (!account) return;

    const appointmentId = parsePositiveInt(req.params.id);
    if (!appointmentId) {
      return res.status(400).json({ error: "Invalid appointment id" });
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
