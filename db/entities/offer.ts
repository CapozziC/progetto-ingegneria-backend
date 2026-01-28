import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Check,
  Index,
} from "typeorm";

import { Advertisement } from "./advertisement.js";
import { User } from "./user.js";
import { Agent } from "./agent.js";

export enum Status {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Entity("offer")
@Check(`"price" > 0`)
@Check(`"status" IN ('pending', 'accepted', 'rejected')`)
@Index("IDX_offer_status_advertisement_agent", [
  "status",
  "advertisement",
  "agent",
])
export class Offer {
  @PrimaryGeneratedColumn()
  id!: number;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone",
  })
  createdAt!: Date;

  @Column({ type: "decimal", precision: 12, scale: 0 })
  price!: number;

  @Column({
    type: "enum",
    enum: Status,
    default: Status.PENDING,
  })
  status!: Status;

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
  @ManyToOne(() => Agent, (agent) => agent.offers, { onDelete: "NO ACTION" })
  agent!: Agent;
}
