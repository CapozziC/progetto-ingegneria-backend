import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Check,
  Index,
  JoinColumn,
} from "typeorm";

import { Advertisement } from "./advertisement.js";
import { Account } from "./account.js";
import { Agent } from "./agent.js";

export enum Status {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}

@Entity("offer")
@Check(`"price" > 0`)
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

  @Column({ type: "int", name: "advertisement_id" })
  advertisementId!: number;

  @Column({ type: "int", name: "account_id" })
  accountId!: number;

  @Column({ type: "int", name: "agent_id" })
  agentId!: number;

  /**
   * Advertisement this offer refers to
   * If the advertisement is deleted, the offer is deleted as well.
   */
  @ManyToOne(() => Advertisement, (advertisement) => advertisement.offers, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "advertisement_id", foreignKeyConstraintName: "FK_offer_advertisement" })
  advertisement!: Advertisement;

  /**
   * User who made this offer
   * If the account is deleted, the offer is deleted as well.
   */
  @ManyToOne(() => Account, (account) => account.offers, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id", foreignKeyConstraintName: "FK_offer_account" })
  account!: Account;

  /**
   * Agent responsible for this offer
   * If the agent is deleted, the offer is deleted as well.
   */
  @ManyToOne(() => Agent, (agent) => agent.offers, {
    onDelete: "NO ACTION",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "agent_id", foreignKeyConstraintName: "FK_offer_agent" })
  agent!: Agent;
}
