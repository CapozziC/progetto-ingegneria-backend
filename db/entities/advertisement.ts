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
} from "typeorm";
import { Agent } from "./agent.js";
import { RealEstate } from "./realEstate.js";
import type { Appointment } from "./appointment.js";
import type { Photo } from "./photo.js";
import type { Offer } from "./offer.js";

export enum AdvertisementStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum TypeAdvertisement {
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
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;

  @Column({
    type: "enum",
    enum: AdvertisementStatus,
    default: AdvertisementStatus.ACTIVE,
  })
  status!: AdvertisementStatus;

  @Index("IDX_adv_type", ["type"])
  @Column({
    type: "enum",
    enum: TypeAdvertisement,
  })
  type!: TypeAdvertisement;

  @Index("IDX_adv_agent_id", ["agentId"])
  @Column({ name: "agent_id" })
  agentId!: number;

  @Index("IDX_adv_real_estate_id", ["realEstateId"])
  @Column({ name: "real_estate_id" })
  realEstateId!: number;

  /**
   * Agent who published and manages this advertisement.
   * If the agent is deleted, the advertisement is deleted as well.
   */
  @ManyToOne(() => Agent, (agent) => agent.advertisements, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "agent_id" })
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
   * Real estate property described by this advertisement
   */
  @OneToOne(() => RealEstate, { onDelete: "CASCADE", cascade: true })
  @JoinColumn({ name: "real_estate_id" })
  realEstate!: RealEstate;
}
