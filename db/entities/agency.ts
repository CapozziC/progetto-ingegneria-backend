import { Entity, PrimaryGeneratedColumn, Column, OneToMany, OneToOne } from "typeorm";
import { Agent } from "./agent.js";
import { Photo } from "./photo.js";

@Entity("agency")
export class Agency {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  phoneNumber!: string;

  @Column()
  email?: string;

  /**
   * Agents that belong to this agency
   */
  @OneToMany(() => Agent, (agent) => agent.agency)
  agent!: Agent[];

  /**
   * Photo representing this agency
   */
  @OneToOne(() => Photo, (photo) => photo.agency, { cascade: true })
  photo?: Photo;
}
