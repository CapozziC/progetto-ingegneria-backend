import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  JoinColumn,
  Check,
  Index,
  ManyToMany,
  JoinTable,
} from "typeorm";
import { Agent } from "./agent.js";
import { RealEstate } from "./realEstate.js";
import type { Appointment } from "./appointment.js";
import type { Photo } from "./photo.js";
import type { Offer } from "./offer.js";
import { Poi } from "./poi.js";

export enum Status {
  ACTIVE = "active",
  SOLD = "sold",
}

export enum Type {
  SALE = "sale",
  RENT = "rent",
}

@Entity("advertisement")
@Check(`length(trim("description")) > 0`)
@Check(`"price" > 0`)
@Index("IDX_adv_status_price", ["status", "price"])
export class Advertisement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: "varchar", length: 500 })
  description!: string;

  @Column({ type: "decimal", precision: 12, scale: 0 })
  price!: number;

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
    default: Status.ACTIVE,
  })
  status!: Status;

  @Index("IDX_adv_type", ["type"])
  @Column({
    type: "enum",
    enum: Type,
  })
  type!: Type;

  @Index("IDX_adv_agent_id", ["agentId"])
  @Column({ name: "agent_id" })
  agentId!: number;

  @Index("IDX_adv_real_estate_id", ["realEstateId"])
  @Column({ name: "real_estate_id" })
  realEstateId!: number;

  /**
   * Agent who published and manages this advertisement.
   * If the agent is deleted, restrict deletion if advertisements exist.
   */
  @ManyToOne(() => Agent, (agent) => agent.advertisements, {
    onDelete: "RESTRICT",
    onUpdate: "CASCADE",
  })
  @JoinColumn({ name: "agent_id", foreignKeyConstraintName: "FK_advertisement_agent" })
  agent!: Agent;

  /**
   * Offers received for this advertisement
   */
  @OneToMany("Offer", (offer: Offer) => offer.advertisement)
  offers!: Offer[];

  /**
   * Appointments scheduled for this advertisement
   */
  @OneToMany(
    "Appointment",
    (appointment: Appointment) => appointment.advertisement,
  )
  appointments!: Appointment[];

  /**
   * Photos associated with this advertisement
   */
  @OneToMany("Photo", (photo: Photo) => photo.advertisement)
  photos!: Photo[];

  /**
   * Points of interest associated with this advertisement
   */

  @ManyToMany(() => Poi)
  @JoinTable({
    name: "advertisement_poi",
    joinColumn: {
      name: "advertisement_id",
      referencedColumnName: "id",
      foreignKeyConstraintName: "FK_advertisement_poi_advertisement",
    },
    inverseJoinColumn: {
      name: "poi_id",
      referencedColumnName: "id",
      foreignKeyConstraintName: "FK_advertisement_poi",
    },
  })
  pois!: Poi[];

  /**
   * Real estate property described by this advertisement
   */

  @OneToOne(() => RealEstate, {
    onDelete: "CASCADE",
    cascade: true,

  })
  @JoinColumn({ name: "real_estate_id" , foreignKeyConstraintName: "FK_advertisement_real_estate" })
  realEstate!: RealEstate;
}
