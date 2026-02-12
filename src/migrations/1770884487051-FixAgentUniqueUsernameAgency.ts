import { MigrationInterface, QueryRunner } from "typeorm";

export class FixAgentUniqueUsernameAgency1770884487051 implements MigrationInterface {
  name = "FixAgentUniqueUsernameAgency1770884487051";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) elimina il vecchio vincolo (quello che ti dava mismatch)
    await queryRunner.query(`
      ALTER TABLE "agent"
      DROP CONSTRAINT IF EXISTS "UQ_agent_username_agencyId"
    `);

    // 2) crea il vincolo giusto su username + agency_id
    await queryRunner.query(`
      ALTER TABLE "agent"
      ADD CONSTRAINT "UQ_agent_username_agency"
      UNIQUE ("username", "agency_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agent"
      DROP CONSTRAINT IF EXISTS "UQ_agent_username_agency"
    `);

    // rollback col vecchio NOME (sempre su agency_id perché agencyId non è colonna DB)
    await queryRunner.query(`
      ALTER TABLE "agent"
      ADD CONSTRAINT "UQ_agent_username_agencyId"
      UNIQUE ("username", "agency_id")
    `);
  }
}
