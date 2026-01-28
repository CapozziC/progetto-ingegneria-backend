import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Check,
} from "typeorm";

export enum Provider {
  GOOGLE = "google",
  GITHUB = "github",
  FACEBOOK = "facebook",
}

@Entity("user")
@Check(`"provider" IN ('google', 'github', 'facebook')`)
@Check(`length(trim("first_name")) > 0`)
@Check(`length(trim("last_name")) > 0`)
@Check(`"email" ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'`)
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: "first_name", type: "varchar", length: 50 })
  firstName!: string;

  @Column({ name: "last_name", type: "varchar", length: 50 })
  lastName!: string;

  @Column({ type: "varchar", length: 100, unique: true })
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

  @CreateDateColumn({ name: "created_at", type: "timestamp with time zone" })
  createdAt!: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp with time zone",
  })
  updatedAt!: Date;
}
