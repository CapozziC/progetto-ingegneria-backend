import { AppDataSource } from "../data-source.js";
import { Appointment } from "../entities/appointment.js";
export const AppointmentRepository = AppDataSource.getRepository(Appointment);