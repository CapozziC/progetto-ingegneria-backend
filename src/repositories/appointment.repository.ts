import { Between, In } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { Appointment, Status } from "../entities/appointment.js";
import { FindOptionsWhere } from "typeorm/browser";
export const AppointmentRepository = AppDataSource.getRepository(Appointment);

type AppointmentFilter = {
  status?: Status;
  from?: Date;
  to?: Date;
};

/**
 * Helper function to build the where clause for finding appointments with optional filtering by status and date range. This function constructs a where clause based on the provided base criteria and additional filtering options, allowing for flexible querying of appointments based on their status and appointment date.
 * @param base An object representing the base criteria for filtering appointments (e.g., agentId or accountId)
 * @param options An optional object containing additional filtering criteria, including appointment status and date range (from and to)
 * @returns An object representing the where clause for filtering appointments based on the provided criteria and options
 */
function buildAppointmentFilters(
  base: FindOptionsWhere<Appointment>,
  options?: AppointmentFilter,
): FindOptionsWhere<Appointment> {
  const where: FindOptionsWhere<Appointment> = { ...base };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.from && options?.to) {
    where.appointmentAt = Between(options.from, options.to);
  }

  return where;
}

/**
 * Find all taken appointment dates for a specific agent within a given date range.
 * @param agentId The unique identifier of the agent for whom to find taken appointments
 * @param from The start date of the range to check for taken appointments
 * @param to The end date of the range to check for taken appointments
 * @returns A Promise that resolves to an array of Date objects representing the taken appointment dates for the specified agent within the given date range
 */
export const findTakenAppointmentsForAgent = async (
  agentId: number,
  from: Date,
  to: Date,
): Promise<Date[]> => {
  const appointments = await AppointmentRepository.find({
    where: {
      agentId,
      appointmentAt: Between(from, to),
      status: In([Status.REQUESTED, Status.CONFIRMED]),
    },
    select: { appointmentAt: true },
  });

  return appointments.map((a) => a.appointmentAt);
};

/**
 * Save an appointment to the database. This function takes an Appointment object and saves it to the database using the AppointmentRepository. It returns a Promise that resolves to the saved Appointment object, which may include additional fields such as the generated ID.
 * @param appointment The Appointment object to save to the database
 * @returns A Promise that resolves to the saved Appointment object
 */
export const saveAppointment = async (
  appointment: Appointment,
): Promise<Appointment> => {
  return AppointmentRepository.save(appointment);
};
/**
 *  Find appointments for a specific agent with optional filtering by status and date range. This function queries the database for appointments associated with the given agent ID, and allows filtering by appointment status and a date range defined by "from" and "to" parameters. The results include related advertisement and account entities, and are ordered by appointment date in ascending order.
 * @param agentId The unique identifier of the agent for whom to find appointments
 * @param options An optional object containing filtering criteria, including appointment status and date range (from and to)
 * @returns A Promise that resolves to an array of Appointment objects that match the specified criteria, including their related advertisement and account entities
 */

export const findAppointmentsByAgentId = async (
  agentId: number,
  options?: AppointmentFilter,
) => {
  return AppointmentRepository.find({
    where: buildAppointmentFilters({ agentId }, options),
    relations: { advertisement: true, account: true },
    order: { appointmentAt: "ASC" },
  });
};

/**
 * Find an appointment by its unique identifier (ID) for a specific agent. This function queries the database for an appointment with the specified ID and agent ID, and returns it if found. If no appointment is found with the given criteria, it returns null.
 * @param appointmentId The unique identifier of the appointment to find
 * @param agentId The unique identifier of the agent associated with the appointment
 * @returns A Promise that resolves to the Appointment object if found, or null if not found
 */

export const findAppointmentByIdForAgent = async (
  appointmentId: number,
  agentId: number,
): Promise<Appointment | null> => {
  return AppointmentRepository.findOne({
    where: { id: appointmentId, agentId },
  });
};

/**
 * Find appointments for a specific account with optional filtering by status and date range. This function queries the database for appointments associated with the given account ID, and allows filtering by appointment status and a date range defined by "from" and "to" parameters. The results include related advertisement and agent entities, and are ordered by appointment date in ascending order.
 * @param accountId The unique identifier of the account for whom to find appointments
 * @param options An optional object containing filtering criteria, including appointment status and date range (from and to)
 * @returns A Promise that resolves to an array of Appointment objects that match the specified criteria, including their related advertisement and agent entities
 */
export const findAppointmentsByAccount = async (
  accountId: number,
  options?: AppointmentFilter,
): Promise<Appointment[]> => {
  return AppointmentRepository.find({
    where: buildAppointmentFilters({ accountId }, options),
    relations: {
      advertisement: true,
      agent: true,
    },
    order: {
      appointmentAt: "ASC",
    },
  });
};

/**
 * Find an appointment by its unique identifier (ID) for a specific account. This function queries the database for an appointment with the specified ID and account ID, and returns it if found. If no appointment is found with the given criteria, it returns null.
 * @param appointmentId The unique identifier of the appointment to find
 * @param accountId The unique identifier of the account associated with the appointment
 * @returns A Promise that resolves to the Appointment object if found, or null if not found
 */
export const findAppointmentByIdForAccount = async (
  appointmentId: number,
  accountId: number,
): Promise<Appointment | null> => {
  return AppointmentRepository.findOne({
    where: {
      id: appointmentId,
      accountId,
    },
  });
};
