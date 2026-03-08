import { MigrationInterface, QueryRunner } from "typeorm";

export class AddRentedStatusAndRentedAtToAdvertisement1772954517749
  implements MigrationInterface
{
  name = "AddRentedStatusAndRentedAtToAdvertisement1772954517749";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1) rimuovo il check vecchio che dipende da status
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      DROP CONSTRAINT IF EXISTS "CHK_advertisement_sold_fields"
    `);

    // 2) creo rented_at
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ADD COLUMN IF NOT EXISTS "rented_at" TIMESTAMP WITH TIME ZONE
    `);

    // 3) ricreo l'enum invece di fare ADD VALUE
    await queryRunner.query(`
      ALTER TYPE "advertisement_status_enum"
      RENAME TO "advertisement_status_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "advertisement_status_enum" AS ENUM(
        'active',
        'sold',
        'rented'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "status" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "status"
      TYPE "advertisement_status_enum"
      USING "status"::text::"advertisement_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "status"
      SET DEFAULT 'active'
    `);

    await queryRunner.query(`
      DROP TYPE "advertisement_status_enum_old"
    `);

    // 4) check status/type
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ADD CONSTRAINT "CHK_advertisement_status_type"
      CHECK (
        ("status" <> 'rented' OR "type" = 'rent')
        AND
        ("status" <> 'sold' OR "type" = 'sale')
      )
    `);

    // 5) check coerenza campi finali
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ADD CONSTRAINT "CHK_advertisement_closed_fields"
      CHECK (
        (
          "status" = 'active'
          AND "sold_price" IS NULL
          AND "sold_at" IS NULL
          AND "rented_at" IS NULL
        )
        OR
        (
          "status" = 'sold'
          AND "sold_price" IS NOT NULL
          AND "sold_at" IS NOT NULL
          AND "rented_at" IS NULL
        )
        OR
        (
          "status" = 'rented'
          AND "sold_price" IS NULL
          AND "sold_at" IS NULL
          AND "rented_at" IS NOT NULL
        )
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      DROP CONSTRAINT IF EXISTS "CHK_advertisement_closed_fields"
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      DROP CONSTRAINT IF EXISTS "CHK_advertisement_status_type"
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      DROP COLUMN IF EXISTS "rented_at"
    `);

    // ricreo enum senza rented
    await queryRunner.query(`
      ALTER TYPE "advertisement_status_enum"
      RENAME TO "advertisement_status_enum_old"
    `);

    await queryRunner.query(`
      CREATE TYPE "advertisement_status_enum" AS ENUM(
        'active',
        'sold'
      )
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "status" DROP DEFAULT
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "status"
      TYPE "advertisement_status_enum"
      USING "status"::text::"advertisement_status_enum"
    `);

    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ALTER COLUMN "status"
      SET DEFAULT 'active'
    `);

    await queryRunner.query(`
      DROP TYPE "advertisement_status_enum_old"
    `);

    // ripristino il vecchio check
    await queryRunner.query(`
      ALTER TABLE "advertisement"
      ADD CONSTRAINT "CHK_advertisement_sold_fields"
      CHECK (
        (
          "status" = 'sold'
          AND "sold_price" IS NOT NULL
          AND "sold_at" IS NOT NULL
        )
        OR
        (
          "status" = 'active'
          AND "sold_price" IS NULL
          AND "sold_at" IS NULL
        )
      )
    `);
  }
}