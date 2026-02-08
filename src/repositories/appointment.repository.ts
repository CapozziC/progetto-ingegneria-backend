import { AppDataSource } from "../data-source.js";
import { Appointment } from "../../src/entities/appointment.js";
export const AppointmentRepository = AppDataSource.getRepository(Appointment);