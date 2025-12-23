import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBalanceToUsersTable1700000000007 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'users',
      new TableColumn({
        name: 'balance',
        type: 'decimal',
        precision: 10,
        scale: 2,
        default: 0,
        isNullable: false,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('users', 'balance');
  }
}
