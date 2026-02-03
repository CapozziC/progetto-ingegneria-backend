import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  Check,
  JoinColumn,
  Index,
} from "typeorm";
import type { Advertisement } from "./advertisement.js";

export enum Format {
  JPEG = "JPEG",
  JPG = "JPG",
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

  @Column({ type: "text" })
  url!: string;

  @Column({
    type: "int",
    default: 0,
  })
  position!: number;

  @Index("IDX_advertisement_id")
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
  @JoinColumn({ name: "advertisement_id" , foreignKeyConstraintName: "FK_photo_advertisement" })
  advertisement!: Advertisement;
}
