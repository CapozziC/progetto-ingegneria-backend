import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  Check,
  JoinColumn,
} from "typeorm";
import type { Advertisement } from "./advertisement.js";
import { Agency } from "./agency.js";

export enum Format {
  JPEG = "JPEG",
  PNG = "PNG",
  HEIC = "HEIC",
}

@Entity("photo")
@Check(`length(trim("url")) > 0`)
@Check(`"position" >= 0`)
export class Photo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "enum",
    enum: Format,
  })
  format!: Format;

  @Column()
  url!: string;

  @Column({
    type: "int",
    default: 0,
  })
  position!: number;

  /**
   * Agency this photo represents
   */
  @OneToOne(() => Agency, (agency) => agency.photo)
  agency!: Agency;

  @Column({ name: "advertisement_id" })
  advertisementId!: number;

  /**
   * Advertisement this photo refers to
   * If the advertisement is deleted, the photo is deleted as well.
   */
  @ManyToOne(
    "Advertisement",
    (advertisement: Advertisement) => advertisement.photos,
    {
      onDelete: "CASCADE",
    },
  )
  @JoinColumn({ name: "advertisement_id" })
  advertisement!: Advertisement;
}
