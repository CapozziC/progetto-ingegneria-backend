import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";    

export enum userType {
  AGENT = "agent",
  USER = "user",
}

@Entity("token")
export class Token {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  subjectId!: number;

  @Column({
    type: "enum",
    enum: userType,
  })
  type!: userType;

  @Column()
  refreshToken!: string;

  @Column()
  expiresAt!: Date;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;
}
