import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteAgencyCheckWithoutName1770892551769 implements MigrationInterface {
  name = "DeleteAgencyCheckWithoutName1770892551769";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agency"
      DROP CONSTRAINT IF EXISTS "CHK_2ac12454a539bb0591d175a0f0";
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Nessun ripristino automatico
  }
}
