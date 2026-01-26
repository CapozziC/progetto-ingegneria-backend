import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
} from "typeorm";

import { User } from "./user.js";
import { Advertisement } from "./advertisement.js";
import { Agent } from "./agent.js";

export enum AppointmentStatus {
  REQUESTED = "requested",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Entity("appointment")
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  appointmentAt!: Date;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;

  @Column({
    type: "enum",
    enum: AppointmentStatus,
    default: AppointmentStatus.REQUESTED,
  })
  status!: AppointmentStatus;

  /**
   * User who requested this appointment
   * If the user is deleted, the appointment is deleted as well.
   */
  @ManyToOne(() => User, (user) => user.id, {
    onDelete: "CASCADE",
  })
  user!: User;

  /**
   * Advertisement this appointment refers to
   * If the advertisement is deleted, the appointment is deleted as well.
   */
  @ManyToOne(
    () => Advertisement,
    (advertisement) => advertisement.appointments,
    { onDelete: "CASCADE" }
  )
  advertisement!: Advertisement;

  /**
   * Agent responsible for handling this appointment
   * If the agent is deleted, the appointment is deleted as well.
   */
  @ManyToOne(() => Agent, (agent) => agent.appointments, {
    onDelete: "CASCADE",
  })
  agent!: Agent;
}
