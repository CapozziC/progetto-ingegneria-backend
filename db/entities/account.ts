import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
  OneToMany,
  Unique,
} from "typeorm";

import type { Appointment } from "./appointment.js";
import type { Offer } from "./offer.js";

export enum Provider {
  GOOGLE = "google",
  GITHUB = "github",
  FACEBOOK = "facebook",
}

@Entity("Account")
@Check(`length(trim("first_name")) > 0`)
@Check(`length(trim("last_name")) > 0`)
@Check(`length(trim("provider_account_id")) > 0 OR provider_account_id IS NULL`)
@Check(
  `email IS NULL OR (length(trim(both from email)) > 0 AND trim(both from email) ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$')`,
)
@Unique("UQ_account_email", ["email"])
@Unique("UQ_account_id_provider", ["providerAccountId"])
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "first_name", type: "varchar", length: 50 })
  firstName!: string;

  @Column({ name: "last_name", type: "varchar", length: 50 })
  lastName!: string;

  @Column({ type: "varchar", length: 100, nullable: true })
  email?: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  password?: string;

  @Column({
    type: "enum",
    enum: Provider,
    nullable: true,
  })
  provider?: Provider;

  @Column({
    name: "provider_account_id",
    type: "text",
    nullable: true,
  })
  providerAccountId?: string;

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
  })
  updatedAt!: Date;

  /**
   * Appointments requested by this user
   */
  @OneToMany("Appointment", (appointment: Appointment) => appointment.account)
  appointments!: Appointment[];

  /**
   * Offers made by this user
   */
  @OneToMany("Offer", (offer: Offer) => offer.account)
  offers!: Offer[];
}
