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
} from "typeorm";
import { Agent } from "./agent.js";
import { RealEstate } from "./realEstate.js";
import { Appointment } from "./appointment.js";

import { Photo } from "./photo.js";
import { Offer } from "./offer.js";

export enum AdvertisementStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
}

export enum TypeAdvertisement {
  SALE = "sale",
  RENT = "rent",
}

@Entity("advertisement")
export class Advertisement {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  description!: string;

  @Column("decimal")
  price!: number;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({
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

  @Column({
    type: "enum",
    enum: TypeAdvertisement,
  })
  type!: TypeAdvertisement;

  /**
   * Agent who published and manages this advertisement.
   * If the agent is deleted, the advertisement is deleted as well.
   */
  @ManyToOne(() => Agent, (agent) => agent.advertisements, {
    onDelete: "CASCADE",
  })
  agent!: Agent;

  /**
   * Offers received for this advertisement
   */
  @OneToMany(() => Offer, (offer) => offer.advertisement)
  offers!: Offer[];

  /**
   * Appointments scheduled for this advertisement
   */
  @OneToMany(() => Appointment, (appointment) => appointment.advertisement)
  appointments!: Appointment[];

  /**
   * Photos associated with this advertisement
   */
  @OneToMany(() => Photo, (photo) => photo.advertisement)
  photos!: Photo[];

  /**
   * Real estate property described by this advertisement
   */
  @OneToOne(() => RealEstate, { onDelete: "CASCADE", cascade: true })
  @JoinColumn()
  realEstate!: RealEstate;
}
