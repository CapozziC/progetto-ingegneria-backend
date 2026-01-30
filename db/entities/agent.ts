import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  OneToMany,
  ManyToOne,
  Check,
  Index,
  JoinColumn,
  UpdateDateColumn,
} from "typeorm";
import type { Advertisement } from "./advertisement.js";
import type { Offer } from "./offer.js";
import type { Appointment } from "./appointment.js";
import type { Agency } from "./agency.js";

@Entity("agent")
@Check(`length(trim("first_name")) > 1`)
@Check(`length(trim("last_name")) > 1`)
@Check(`"username" ~ '^(agent|admin)[0-9]+$'`)
@Check(`length(trim("password")) > 0`)
@Check(`"phone_number" ~ '^\\+[1-9][0-9]{7,14}$'`)
export class Agent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "first_name", type: "varchar", length: 30 })
  firstName!: string;

  @Column({ name: "last_name", type: "varchar", length: 30 })
  lastName!: string;

  @Column({type: "text", unique: true })
  username!: string;

  @Column({ type: "varchar", length: 255 })
  password!: string;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp with time zone"
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
  })
  updatedAt!: Date;

  @Column({ name: "phone_number", type: "varchar", length: 15 })
  phoneNumber!: string;

  @Column({ name: "is_admin" })
  isAdmin!: boolean;

  /**
   * Advertisements managed by this Agent
   */
  @OneToMany(
    "Advertisement",
    (advertisement: Advertisement) => advertisement.agent,
  )
  advertisements!: Advertisement[];

  @Index("IDX_agent_agency_id", ["agencyId"])
  @Column({ name: "agency_id" })
  agencyId!: number;

  @Index("IDX_agent_administrator_id", ["administratorId"])
  @Column({ name: "administrator_id", nullable: true })
  administratorId!: number | null;

  /**
   * Offers managed by this Agent
   */
  @OneToMany("Offer", (offer: Offer) => offer.agent)
  offers!: Offer[];

  /**
   * Appointments managed by this Agent
   */
  @OneToMany("Appointment", (appointment: Appointment) => appointment.agent)
  appointments!: Appointment[];

  /**
   * Real estate agency this Agent belongs to
   * If the agency is deleted, the agent is also deleted
   */
  @ManyToOne("Agency", (realEstateAgency: Agency) => realEstateAgency.agent, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "agency_id" })
  agency!: Agency;

  /**
   * Administrator responsible for this Agent
   */
  @ManyToOne(() => Agent, (agent) => agent.agents, {
    onDelete: "SET NULL",onUpdate: "CASCADE",
    nullable: true,
  })
  @JoinColumn({ name: "administrator_id" })
  administrator!: Agent;

  /**
   * Agents managed by this Administrator
   */
  @OneToMany(() => Agent, (agent) => agent.administrator)
  agents!: Agent[];
}
