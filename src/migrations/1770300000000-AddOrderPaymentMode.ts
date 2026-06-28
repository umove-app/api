import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds payment-mode gating to orders:
 *  - paymentMode: PREPAID (default) or PAY_ON_DELIVERY. Passenger orders are
 *    always PREPAID; goods orders may be PAY_ON_DELIVERY.
 *  - isPaid: set true once a PREPAID order's payment succeeds.
 * PREPAID orders are only dispatched to drivers after payment.
 */
export class AddOrderPaymentMode1770300000000 implements MigrationInterface {
  name = 'AddOrderPaymentMode1770300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'orders_paymentmode_enum') THEN
          CREATE TYPE "orders_paymentmode_enum" AS ENUM ('PREPAID', 'PAY_ON_DELIVERY');
        END IF;
      END $$;`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "paymentMode" "orders_paymentmode_enum" NOT NULL DEFAULT 'PREPAID'`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "isPaid" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "isPaid"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN IF EXISTS "paymentMode"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "orders_paymentmode_enum"`);
  }
}
