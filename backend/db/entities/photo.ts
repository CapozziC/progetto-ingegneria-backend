import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { Advertisement } from "./advertisement.js";
import { Agency } from "./agency.js";

export enum Format {
  JPEG = "JPEG",
  PNG = "PNG",
  HEIC = "HEIC",
}

@Entity("photo")
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
   * If the agency is deleted, the photo is deleted as well.
   */
  @OneToOne(() => Agency, { onDelete: "CASCADE" })
  @JoinColumn()
  agency?: Agency;

  /**
   * Advertisement this photo refers to
   * If the advertisement is deleted, the photo is deleted as well.
   */
  @ManyToOne(() => Advertisement, (advertisement) => advertisement.photos, {
    onDelete: "CASCADE",
  })
  advertisement!: Advertisement;
}
