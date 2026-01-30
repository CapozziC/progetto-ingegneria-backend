import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Check,
  Index,
} from "typeorm";
import type { Agent } from "./agent.js";

@Entity("agency")
@Check(`length(trim("name")) > 1`)
@Check(`length(trim("phone_number")) > 0`)
@Check(`"phone_number" ~ '^\\+[1-9][0-9]{7,14}$'`)
@Check(`"email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`)
export class Agency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index("IDX_agency_name", ["name"])
  @Column({ type: "varchar", length: 30 })
  name!: string;

  @Column({ name: "phone_number", type: "varchar", length: 15 })
  phoneNumber!: string;

  @Column({ type: "varchar", length: 100, unique: true })
  email!: string;

  /**
   * Agents that belong to this agency
   */
  @OneToMany("Agent", (agent: Agent) => agent.agency)
  agent!: Agent[];
}
