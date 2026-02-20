import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUniqueAgentPhoneNumber1771585783327 implements MigrationInterface {
  name = "AddUniqueAgentPhoneNumber1771585783327";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent"
      ADD CONSTRAINT "UQ_agent_phone_number"
      UNIQUE ("phone_number")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent"
      DROP CONSTRAINT "UQ_agent_phone_number"
    `);
  }
}
