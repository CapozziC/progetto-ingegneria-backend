import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddBathroomsToRealEstate1773126595398 implements MigrationInterface {
  name = "AddBathroomsToRealEstate1773126595398";

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      "real_estate",
      new TableColumn({
        name: "bathrooms",
        type: "int",
        isNullable: false,
        default: 1,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn("real_estate", "bathrooms");
  }
}
