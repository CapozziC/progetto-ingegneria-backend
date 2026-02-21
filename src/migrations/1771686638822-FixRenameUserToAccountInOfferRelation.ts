import { MigrationInterface, QueryRunner } from "typeorm";

export class FixRenameUserToAccountInOfferRelation1771686638822 implements MigrationInterface {
  name = "FixRenameUserToAccountInOfferRelation1771686638822";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offer"
      DROP CONSTRAINT IF EXISTS "FK_offer_account";
    `);

    await queryRunner.query(`
      ALTER TABLE "offer"
      DROP COLUMN IF EXISTS "user_id";
    `);

    await queryRunner.query(`
      ALTER TABLE "offer"
      ADD CONSTRAINT "FK_offer_account"
      FOREIGN KEY ("account_id")
      REFERENCES "account"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "offer"
      DROP CONSTRAINT IF EXISTS "FK_offer_account";
    `);

    await queryRunner.query(`
      ALTER TABLE "offer"
      ADD COLUMN IF NOT EXISTS "user_id" integer;
    `);

    await queryRunner.query(`
      ALTER TABLE "offer"
      ADD CONSTRAINT "FK_offer_account"
      FOREIGN KEY ("user_id")
      REFERENCES "account"("id")
      ON DELETE CASCADE
      ON UPDATE NO ACTION;
    `);
  }
}
