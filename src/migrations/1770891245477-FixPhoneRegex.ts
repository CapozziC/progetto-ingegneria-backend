import { MigrationInterface, QueryRunner } from "typeorm";

export class FixPhoneRegexChecks1770891245477 implements MigrationInterface {
  name = "FixPhoneRegexChecks1770891245477";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Agency
    await queryRunner.query(`
      ALTER TABLE "agency" DROP CONSTRAINT IF EXISTS "CHK_agency_phone_number";
    `);
    await queryRunner.query(`
      ALTER TABLE "agency"
      ADD CONSTRAINT "CHK_agency_phone_number"
      CHECK ("phone_number" ~ '^\\+[1-9][0-9]{7,14}$');
    `);

    
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "agency" DROP CONSTRAINT IF EXISTS "CHK_agency_phone_number";
    `);
  }
}

