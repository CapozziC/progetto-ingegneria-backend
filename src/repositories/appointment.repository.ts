import { Between, In } from "typeorm";
import { AppDataSource } from "../data-source.js";
import { Appointment, Status } from "../entities/appointment.js";
import { FindOptionsWhere } from "typeorm/browser";
export const AppointmentRepository = AppDataSource.getRepository(Appointment);

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

export const saveAppointment = async (
  appointment: Appointment,
): Promise<Appointment> => {
  return AppointmentRepository.save(appointment);
};

export const findAppointmentsByAgentId = async (
  agentId: number,
  options?: {
    status?: Status;
    from?: Date;
    to?: Date;
  },
) => {
  const where: FindOptionsWhere<Appointment> = { agentId };

  if (options?.status) {
    where.status = options.status;
  }
  if (options?.from && options?.to) {
    where.appointmentAt = Between(options.from, options.to);
  }
  return AppointmentRepository.find({
    where,
    relations: { advertisement: true, account: true },
    order: { appointmentAt: "ASC" },
  });
};

export const findAppointmentByIdForAgent = async (
  appointmentId: number,
  agentId: number,
): Promise<Appointment | null> => {
  return AppointmentRepository.findOne({
    where: { id: appointmentId, agentId },
  });
};

export const findAppointmentsByAccount = async (
  accountId: number,
  options?: {
    status?: Status;
    from?: Date;
    to?: Date;
  },
): Promise<Appointment[]> => {
  const where: FindOptionsWhere<Appointment> = { accountId };

  if (options?.status) {
    where.status = options.status;
  }

  if (options?.from && options?.to) {
    where.appointmentAt = Between(options.from, options.to);
  }

  return AppointmentRepository.find({
    where,
    relations: {
      advertisement: true,
      agent: true,
    },
    order: {
      appointmentAt: "ASC",
    },
  });
};

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

