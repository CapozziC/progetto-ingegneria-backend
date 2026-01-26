import {
  Entity,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  Column,
  OneToMany,
  ManyToOne,
} from "typeorm";
import { Advertisement } from "./advertisement.js";
import { Offer } from "./offer.js";
import { Appointment } from "./appointment.js";
import { Agency } from "./agency.js";

@Entity("agent")
export class Agent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  surname!: string;

  @Column()
  username!: string;

  @Column()
  password!: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @Column()
  phoneNumber!: string;

  @Column({ default: false })
  isAdmin!: boolean;

  /**
   * Advertisements managed by this Agent
   */
  @OneToMany(() => Advertisement, (advertisement) => advertisement.agent)
  advertisements!: Advertisement[];

  /**
   * Offers managed by this Agent
   */
  @OneToMany(() => Offer, (offer) => offer.agent)
  offers!: Offer[];

  /**
   * Appointments managed by this Agent
   */
  @OneToMany(() => Appointment, (appointment) => appointment.agent)
  appointments!: Appointment[];

  /**
   * Real estate agency this Agent belongs to
   * If the agency is deleted, the agent is also deleted
   */
  @ManyToOne(() => Agency, (realEstateAgency) => realEstateAgency.agent, {
    onDelete: "CASCADE",
  })
  agency!: Agency;

  /**
   * Administrator responsible for this Agent
   */
  @ManyToOne(() => Agent, (agent) => agent.agents, {onDelete: "SET NULL"})
  administrator!: Agent;

  /**
   * Agents managed by this Administrator
   */
  @OneToMany(() => Agent, (agent) => agent.administrator)
  agents!: Agent[];
}
