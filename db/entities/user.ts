import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export enum Provider {
  GOOGLE = "google",
  GITHUB = "github",
  FACEBOOK = "facebook",
}

@Entity("user")
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column()
  name!: string;

  @Column()
  surname!: string;

  @Column()
  email!: string;

  @Column({ nullable: true })
  password?: string;

  @Column({
    type: "enum",
    enum: Provider,
    nullable: true,
  })
  provider?: Provider;

  @Column({ nullable: true })
  providerUserId?: string;

  @CreateDateColumn({ type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({
    type: "timestamp with time zone",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt!: Date;
}
