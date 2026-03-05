import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddColumnsSoldPriceAndSoldDateToAdvertisement1772696086662 implements MigrationInterface {
  name = "AddColumnsSoldPriceAndSoldDateToAdvertisement1772696086662";
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns("advertisement", [
      new TableColumn({
        name: "sold_price",
        type: "numeric",
        precision: 12,
        scale: 2,
        isNullable: true,
      }),
      new TableColumn({
        name: "sold_at",
        type: "timestamp",
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("advertisement", "sold_at");
    await queryRunner.dropColumn("advertisement", "sold_price");
  }
}
