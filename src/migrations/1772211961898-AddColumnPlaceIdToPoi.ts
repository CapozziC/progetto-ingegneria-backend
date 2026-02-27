import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddColumnPlaceIdToPoi1772211961898 implements MigrationInterface {
  name = "AddColumnPlaceIdToPoi1772211961898";

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Aggiunge la colonna
    await queryRunner.addColumn(
      "poi",
      new TableColumn({
        name: "geoapify_place_id",
        type: "text",
        isNullable: true,
      }),
    );

    //  Crea indice UNIQUE
    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_poi_geoapify_place_id"
      ON "poi" ("geoapify_place_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop index
    await queryRunner.query(`
      DROP INDEX IF EXISTS "UQ_poi_geoapify_place_id";
    `);

    // Drop column
    await queryRunner.dropColumn("poi", "geoapify_place_id");
  }
}