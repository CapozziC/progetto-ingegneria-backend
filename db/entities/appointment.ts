import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  Check,
  Index,
  JoinColumn,
} from "typeorm";

import { User } from "./user.js";
import { Advertisement } from "./advertisement.js";
import { Agent } from "./agent.js";

export enum Status {
  REQUESTED = "requested",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

@Entity("appointment")
@Check(`(status IN ('completed', 'cancelled') 
  OR appointment_at > CURRENT_TIMESTAMP)`)
@Check(`"status" IN ('requested', 'confirmed', 'cancelled', 'completed')`)
@Index("IDX_appointmentAt_status_agent", ["status", "appointmentAt", "agentId"])
export class Appointment {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    name: "appointment_at",
    type: "timestamp with time zone",
  })
  appointmentAt!: Date;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
  })
  updatedAt!: Date;

  @Column({
    type: "enum",
    enum: Status,
    default: Status.REQUESTED,
  })
  status!: Status;

  @Column({ name: "agent_id" })
  agentId!: number;

  /**
   * User who requested this appointment
   * If the user is deleted, the appointment is deleted as well.
   */
  @ManyToOne(() => User, (user) => user.id, {
    onDelete: "RESTRICT",
  })
  user!: User;

  /**
   * Advertisement this appointment refers to
   * If the advertisement is deleted, the appointment is deleted as well.
   */
  @ManyToOne(
    () => Advertisement,
    (advertisement) => advertisement.appointments,
    { onDelete: "CASCADE" },
  )
  advertisement!: Advertisement;

  /**
   * Agent responsible for handling this appointment
   * If the agent is deleted, the appointment is deleted as well.
   */
  @ManyToOne(() => Agent, (agent) => agent.appointments, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" })
  agent!: Agent;
}
