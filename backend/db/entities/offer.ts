import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from "typeorm";

import { Advertisement } from "./advertisement";
import { User } from "./user";
import { Agent } from "./agent";

export enum OfferStatus {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Entity("offer")
export class Offer {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @Column({ type: "decimal" })
  price!: number;

  @Column({
    type: "enum",
    enum: OfferStatus,
    default: OfferStatus.PENDING,
  })
  status!: OfferStatus;

  /**
   * Advertisement this offer refers to
   * If the advertisement is deleted, the offer is deleted as well.
   */
  @ManyToOne(() => Advertisement, (advertisement) => advertisement.offers, {
    onDelete: "CASCADE",
  })
  advertisement!: Advertisement;

  /**
   * User who made this offer
   * If the user is deleted, the offer is deleted as well.
   */
  @ManyToOne(() => User, (user) => user.id, { onDelete: "CASCADE" })
  user!: User;

  /**
   * Agent responsible for this offer
   * If the agent is deleted, the offer is deleted as well.
   */
  @ManyToOne(() => Agent, (agent) => agent.offers, { onDelete: "CASCADE" })
  agent!: Agent;
}
