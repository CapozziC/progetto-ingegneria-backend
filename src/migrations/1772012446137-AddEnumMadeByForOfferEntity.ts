import { MigrationInterface, QueryRunner } from "typeorm";

export class AddEnumMadeByForOfferEntity1772012446137 implements MigrationInterface {
  name = "AddEnumMadeByForOfferEntity1772012446137";
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE offer_made_by_enum AS ENUM ('ACCOUNT', 'AGENT')
    `);

    await queryRunner.query(`
      ALTER TABLE "offer"
      ADD COLUMN "made_by" offer_made_by_enum NOT NULL DEFAULT 'ACCOUNT'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offer"
      DROP COLUMN "made_by"
    `);

    await queryRunner.query(`
      DROP TYPE offer_made_by_enum
    `);
  }
}
