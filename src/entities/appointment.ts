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

import { Account } from "./account.js";
import { Advertisement } from "./advertisement.js";
import { Agent } from "./agent.js";

export enum Status {
  REQUESTED = "requested",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
  REJECTED = "rejected",
}

@Entity("appointment")
@Check(`(status IN ('confirmed', 'cancelled', 'rejected') 
  OR appointment_at > CURRENT_TIMESTAMP)`)
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

  @Column({ name: "account_id" })
  accountId!: number;

  @Column({ name: "advertisement_id" })
  advertisementId!: number;

  /**
   * User who requested this appointment
   * The user cannot be deleted if appointments exist.
   */
  @ManyToOne(() => Account, (account) => account.appointments, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "user_id" , foreignKeyConstraintName: "FK_appointment_account"})
  account!: Account;
  /**
   * Advertisement this appointment refers to
   * If the advertisement is deleted, the appointment is deleted as well.
   */
  @ManyToOne(
    () => Advertisement,
    (advertisement) => advertisement.appointments,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "advertisement_id" , foreignKeyConstraintName: "FK_appointment_advertisement"})
  advertisement!: Advertisement;

  /**
   * Agent responsible for handling this appointment
   * If the agent is deleted, the appointment is deleted as well.
   */
  @ManyToOne(() => Agent, (agent) => agent.appointments, {
    onDelete: "CASCADE",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "agent_id" , foreignKeyConstraintName: "FK_appointment_agent"})
  agent!: Agent;
}
