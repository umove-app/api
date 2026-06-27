import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds PASSENGER and GOODS to the orders.orderType enum so the mobile app's
 * passenger/goods bookings are accepted by the API (previously only
 * MOVE_TRANSPORT / PARCEL_DELIVERY existed, which rejected those orders).
 *
 * Note: Postgres ADD VALUE cannot run inside a transaction block, so this
 * migration overrides transaction handling.
 */
export class AddPassengerGoodsOrderTypes1770000000000 implements MigrationInterface {
  name = 'AddPassengerGoodsOrderTypes1770000000000';

  // Run outside a transaction (required for ALTER TYPE ... ADD VALUE).
  transaction = false as const;

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."orders_ordertype_enum" ADD VALUE IF NOT EXISTS 'PASSENGER'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."orders_ordertype_enum" ADD VALUE IF NOT EXISTS 'GOODS'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres does not support removing enum values without recreating the
    // type and rewriting dependent columns. Intentionally a no-op; the extra
    // values are harmless if unused.
  }
}
