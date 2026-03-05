import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCheckForSoldAndDateColumn1772714757509 implements MigrationInterface {
  name = "AddCheckForSoldAndDateColumn1772714757509";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ADD CONSTRAINT "CHK_advertisement_sold_fields"
      CHECK (
        (status = 'sold' AND sold_at IS NOT NULL AND sold_price IS NOT NULL)
        OR status = 'active'
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      DROP CONSTRAINT "CHK_advertisement_sold_fields"
    `);
  }
}
