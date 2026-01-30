import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  Check,
  JoinColumn,
} from "typeorm";
import { Agency } from "./agency.js";

export enum Format {
  JPEG = "JPEG",
  JPG = "JPG",
  PNG = "PNG",
  HEIC = "HEIC",
}

@Entity("logo")
@Check(`length(trim("url")) > 0`)
export class Logo {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({
    type: "enum",
    enum: Format,
  })
  format!: Format;

  @Column({ type: "text" })
  url!: string;

  /**
   * Agency this logo represents
   */
  @OneToOne(() => Agency,{ onDelete: "CASCADE" })
  @JoinColumn({ name: "agency_id" })
  agency!: Agency;
}
