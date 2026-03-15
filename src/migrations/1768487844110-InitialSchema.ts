import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1768487844110 implements MigrationInterface {
  name = 'InitialSchema1768487844110';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Enable uuid-ossp extension
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // Create enum types
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_role_enum" AS ENUM('CUSTOMER', 'DRIVER', 'ADMIN', 'ADMIN_SUPERVISOR', 'SUPER_ADMIN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."users_status_enum" AS ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."admin_profiles_adminrole_enum" AS ENUM('ADMIN', 'SUPERVISOR', 'SUPER_ADMIN');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."driver_profiles_kycstatus_enum" AS ENUM('PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'RESUBMISSION_REQUIRED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."driver_profiles_availabilitystatus_enum" AS ENUM('ONLINE', 'OFFLINE', 'ON_TRIP');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."driver_documents_documenttype_enum" AS ENUM('DRIVERS_LICENSE', 'VEHICLE_REGISTRATION', 'VEHICLE_INSURANCE', 'NATIONAL_ID', 'PASSPORT', 'PROOF_OF_ADDRESS');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."orders_ordertype_enum" AS ENUM('MOVE_TRANSPORT', 'PARCEL_DELIVERY');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."orders_status_enum" AS ENUM('PENDING', 'ASSIGNED', 'ACCEPTED', 'CREATED', 'DRIVER_ASSIGNED', 'EN_ROUTE_TO_PICKUP', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'STARTED', 'EN_ROUTE_TO_DROPOFF', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."order_events_eventtype_enum" AS ENUM('CREATED', 'DRIVER_ASSIGNED', 'DRIVER_ACCEPTED', 'DRIVER_DECLINED', 'ARRIVED_AT_PICKUP', 'PICKED_UP', 'STARTED', 'ARRIVED_AT_DROPOFF', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'PAYMENT_INITIATED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_provider_enum" AS ENUM('PAYSTACK', 'STRIPE');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_status_enum" AS ENUM('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'REFUNDED', 'CANCELLED');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."payments_paymentmethod_enum" AS ENUM('CARD', 'BANK_TRANSFER', 'WALLET');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."promos_type_enum" AS ENUM('PERCENTAGE', 'FLAT');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."notifications_type_enum" AS ENUM('ORDER_CREATED', 'DRIVER_ASSIGNED', 'DRIVER_ARRIVED', 'ORDER_STARTED', 'ORDER_COMPLETED', 'ORDER_CANCELLED', 'PAYMENT_SUCCESS', 'PAYMENT_FAILED', 'KYC_APPROVED', 'KYC_REJECTED', 'PROMO_AVAILABLE', 'SYSTEM_ANNOUNCEMENT', 'CUSTOM');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "public"."notifications_status_enum" AS ENUM('PENDING', 'SENT', 'FAILED', 'READ');
      EXCEPTION WHEN duplicate_object THEN null; END $$;
    `);

    // ========== USERS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" varchar(255),
        "firstName" varchar(255),
        "lastName" varchar(255),
        "email" varchar(255) NOT NULL,
        "phone" varchar(20),
        "phoneNumber" varchar(20),
        "password" varchar(255),
        "role" "public"."users_role_enum" NOT NULL DEFAULT 'CUSTOMER',
        "status" "public"."users_status_enum" NOT NULL DEFAULT 'PENDING_VERIFICATION',
        "country" varchar(100),
        "currency" varchar(10) NOT NULL DEFAULT 'NGN',
        "profilePicture" text,
        "defaultAddress" text,
        "defaultLatitude" decimal(10,7),
        "defaultLongitude" decimal(10,7),
        "googleId" varchar(255),
        "appleId" varchar(255),
        "isActive" boolean NOT NULL DEFAULT true,
        "emailVerified" boolean NOT NULL DEFAULT false,
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "phoneVerified" boolean NOT NULL DEFAULT false,
        "isPhoneVerified" boolean NOT NULL DEFAULT false,
        "lastLoginAt" TIMESTAMP,
        "fcmToken" varchar(255),
        "notificationPreferences" jsonb,
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_users_phone" ON "users" ("phone")`);

    // ========== SETTINGS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "vatPercentage" decimal(5,2) NOT NULL DEFAULT 7.5,
        "minimumFare" decimal(10,2) NOT NULL DEFAULT 500,
        "cancellationFeePercentage" decimal(5,2) NOT NULL DEFAULT 10,
        "driverCommissionPercentage" decimal(5,2) NOT NULL DEFAULT 20,
        "maxSearchRadius" decimal(10,2) NOT NULL DEFAULT 10,
        "driverAcceptanceTimeout" integer NOT NULL DEFAULT 300,
        "autoAssignDriver" boolean NOT NULL DEFAULT true,
        "supportEmail" varchar(255),
        "supportPhone" varchar(20),
        "supportAddress" text,
        "companyName" varchar(255),
        "companyAddress" text,
        CONSTRAINT "PK_settings" PRIMARY KEY ("id")
      );
    `);

    // ========== VEHICLE TYPES ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicle_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "name" varchar(100) NOT NULL,
        "description" varchar(255),
        "icon" text,
        "baseFare" decimal(10,2) NOT NULL,
        "perKmRate" decimal(10,2) NOT NULL,
        "perMinuteRate" decimal(10,2),
        "minimumFare" decimal(10,2),
        "maxCapacity" decimal(10,2) NOT NULL,
        "capacityUnit" varchar(20) NOT NULL DEFAULT 'kg',
        "currency" varchar(10) NOT NULL DEFAULT 'NGN',
        "availableCountries" text[] DEFAULT '{}',
        "active" boolean NOT NULL DEFAULT true,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "metadata" jsonb,
        CONSTRAINT "PK_vehicle_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicle_types_name" UNIQUE ("name")
      );
    `);

    // ========== ADMIN PROFILES ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "admin_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "userId" uuid NOT NULL,
        "adminRole" "public"."admin_profiles_adminrole_enum" NOT NULL DEFAULT 'ADMIN',
        "permissions" text,
        "department" varchar(255),
        "employeeId" varchar(255),
        "assignedAt" TIMESTAMP,
        "assignedBy" uuid,
        "metadata" jsonb,
        CONSTRAINT "PK_admin_profiles" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_admin_profiles_userId" ON "admin_profiles" ("userId")`);
    await queryRunner.query(`
      ALTER TABLE "admin_profiles"
      ADD CONSTRAINT "FK_admin_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ========== DRIVER PROFILES ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "driver_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "userId" uuid NOT NULL,
        "kycStatus" "public"."driver_profiles_kycstatus_enum" NOT NULL DEFAULT 'PENDING',
        "availabilityStatus" "public"."driver_profiles_availabilitystatus_enum" NOT NULL DEFAULT 'OFFLINE',
        "licenseNumber" varchar(255),
        "licenseExpiryDate" date,
        "nationalIdNumber" varchar(255),
        "dateOfBirth" date,
        "address" text,
        "city" varchar(100),
        "state" varchar(100),
        "zipCode" varchar(20),
        "emergencyContactName" text,
        "emergencyContactPhone" varchar(20),
        "rating" decimal(3,2) NOT NULL DEFAULT 0,
        "totalTrips" integer NOT NULL DEFAULT 0,
        "completedTrips" integer NOT NULL DEFAULT 0,
        "cancelledTrips" integer NOT NULL DEFAULT 0,
        "lastKnownLatitude" decimal(10,7),
        "lastKnownLongitude" decimal(10,7),
        "lastLocationUpdate" TIMESTAMP,
        "approvedAt" TIMESTAMP,
        "approvedBy" uuid,
        "rejectionReason" text,
        "onlineAt" TIMESTAMP,
        "offlineAt" TIMESTAMP,
        "metadata" jsonb,
        CONSTRAINT "PK_driver_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_driver_profiles_userId" UNIQUE ("userId")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_driver_profiles_userId" ON "driver_profiles" ("userId")`);
    await queryRunner.query(`
      ALTER TABLE "driver_profiles"
      ADD CONSTRAINT "FK_driver_profiles_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ========== DRIVER DOCUMENTS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "driver_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "driverId" uuid NOT NULL,
        "documentType" "public"."driver_documents_documenttype_enum" NOT NULL,
        "documentUrl" varchar(255) NOT NULL,
        "documentNumber" varchar(255),
        "expiryDate" date,
        "verified" boolean NOT NULL DEFAULT false,
        "verifiedAt" TIMESTAMP,
        "verifiedBy" uuid,
        "notes" text,
        CONSTRAINT "PK_driver_documents" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_driver_documents_driverId" ON "driver_documents" ("driverId")`);
    await queryRunner.query(`
      ALTER TABLE "driver_documents"
      ADD CONSTRAINT "FK_driver_documents_driverId" FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ========== VEHICLES ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "vehicles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "driverId" uuid NOT NULL,
        "type" varchar(100) NOT NULL,
        "make" varchar(100) NOT NULL,
        "model" varchar(100) NOT NULL,
        "year" integer NOT NULL,
        "color" varchar(50) NOT NULL,
        "plateNumber" varchar(20) NOT NULL,
        "capacity" decimal(10,2) NOT NULL,
        "capacityUnit" varchar(20) NOT NULL DEFAULT 'kg',
        "registrationDocument" varchar(255),
        "insuranceDocument" varchar(255),
        "insuranceExpiryDate" date,
        "roadworthinessDocument" varchar(255),
        "roadworthinessExpiryDate" date,
        "photos" text[] DEFAULT '{}',
        "verified" boolean NOT NULL DEFAULT false,
        "active" boolean NOT NULL DEFAULT true,
        "verifiedAt" TIMESTAMP,
        "verifiedBy" uuid,
        "metadata" jsonb,
        CONSTRAINT "PK_vehicles" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_vehicles_plateNumber" UNIQUE ("plateNumber")
      );
    `);
    await queryRunner.query(`
      ALTER TABLE "vehicles"
      ADD CONSTRAINT "FK_vehicles_driverId" FOREIGN KEY ("driverId") REFERENCES "driver_profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ========== ORDERS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "customerId" uuid NOT NULL,
        "driverId" uuid,
        "vehicleId" uuid,
        "vehicleTypeId" uuid,
        "orderType" "public"."orders_ordertype_enum" NOT NULL DEFAULT 'MOVE_TRANSPORT',
        "status" "public"."orders_status_enum" NOT NULL DEFAULT 'CREATED',
        "pickupAddress" text NOT NULL,
        "pickupLatitude" decimal(10,7) NOT NULL,
        "pickupLongitude" decimal(10,7) NOT NULL,
        "pickupPhone" varchar(20),
        "pickupNotes" text,
        "destinationAddress" text NOT NULL,
        "destinationLatitude" decimal(10,7) NOT NULL,
        "destinationLongitude" decimal(10,7) NOT NULL,
        "destinationPhone" varchar(20),
        "destinationNotes" text,
        "scheduledAt" TIMESTAMP,
        "isScheduled" boolean NOT NULL DEFAULT false,
        "vehicleType" varchar(100) NOT NULL,
        "estimatedDistance" decimal(10,2),
        "actualDistance" decimal(10,2),
        "distanceUnit" varchar(10) NOT NULL DEFAULT 'km',
        "estimatedDuration" integer,
        "actualDuration" integer,
        "subtotal" decimal(12,2) NOT NULL,
        "vat" decimal(12,2) NOT NULL DEFAULT 0,
        "vatRate" decimal(5,4) NOT NULL DEFAULT 0,
        "discount" decimal(12,2) NOT NULL DEFAULT 0,
        "promoCode" varchar(50),
        "total" decimal(12,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'NGN',
        "assignedAt" TIMESTAMP,
        "acceptedAt" TIMESTAMP,
        "arrivedAtPickupAt" TIMESTAMP,
        "pickedUpAt" TIMESTAMP,
        "startedAt" TIMESTAMP,
        "arrivedAtDestinationAt" TIMESTAMP,
        "deliveredAt" TIMESTAMP,
        "completedAt" TIMESTAMP,
        "cancelledAt" TIMESTAMP,
        "cancelledBy" uuid,
        "cancellationReason" text,
        "metadata" jsonb,
        CONSTRAINT "PK_orders" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_customerId" ON "orders" ("customerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_driverId" ON "orders" ("driverId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_status" ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_orders_createdAt" ON "orders" ("createdAt")`);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_customerId" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_driverId" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_vehicleId" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "orders"
      ADD CONSTRAINT "FK_orders_vehicleTypeId" FOREIGN KEY ("vehicleTypeId") REFERENCES "vehicle_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ========== ORDER EVENTS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_events" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "orderId" uuid NOT NULL,
        "eventType" "public"."order_events_eventtype_enum" NOT NULL,
        "message" text NOT NULL,
        "performedBy" uuid,
        "performedByRole" varchar(100),
        "latitude" decimal(10,7),
        "longitude" decimal(10,7),
        "metadata" jsonb,
        CONSTRAINT "PK_order_events" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_order_events_orderId" ON "order_events" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_order_events_orderId_createdAt" ON "order_events" ("orderId", "createdAt")`);
    await queryRunner.query(`
      ALTER TABLE "order_events"
      ADD CONSTRAINT "FK_order_events_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ========== DRIVER LOCATIONS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "driver_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "orderId" uuid NOT NULL,
        "driverId" uuid NOT NULL,
        "latitude" decimal(10,7) NOT NULL,
        "longitude" decimal(10,7) NOT NULL,
        "speed" decimal(10,2),
        "heading" decimal(5,2),
        "accuracy" decimal(10,2),
        "capturedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "metadata" jsonb,
        CONSTRAINT "PK_driver_locations" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_driver_locations_orderId" ON "driver_locations" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_driver_locations_driverId" ON "driver_locations" ("driverId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_driver_locations_orderId_createdAt" ON "driver_locations" ("orderId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_driver_locations_driverId_createdAt" ON "driver_locations" ("driverId", "createdAt")`);
    await queryRunner.query(`
      ALTER TABLE "driver_locations"
      ADD CONSTRAINT "FK_driver_locations_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ========== PAYMENTS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "orderId" uuid NOT NULL,
        "provider" "public"."payments_provider_enum" NOT NULL,
        "status" "public"."payments_status_enum" NOT NULL DEFAULT 'PENDING',
        "paymentMethod" "public"."payments_paymentmethod_enum",
        "reference" varchar(255) NOT NULL,
        "providerReference" varchar(255),
        "amount" decimal(12,2) NOT NULL,
        "currency" varchar(10) NOT NULL DEFAULT 'NGN',
        "authorizationUrl" text,
        "accessCode" text,
        "paidAt" TIMESTAMP,
        "failedAt" TIMESTAMP,
        "failureReason" text,
        "refundedAt" TIMESTAMP,
        "refundAmount" decimal(12,2),
        "refundReason" text,
        "providerResponse" jsonb,
        "metadata" jsonb,
        CONSTRAINT "PK_payments" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payments_orderId" UNIQUE ("orderId"),
        CONSTRAINT "UQ_payments_reference" UNIQUE ("reference")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_orderId" ON "payments" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_reference" ON "payments" ("reference")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_payments_status" ON "payments" ("status")`);
    await queryRunner.query(`
      ALTER TABLE "payments"
      ADD CONSTRAINT "FK_payments_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);

    // ========== PROMOS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "promos" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "code" varchar(50) NOT NULL,
        "description" varchar(255),
        "type" "public"."promos_type_enum" NOT NULL DEFAULT 'PERCENTAGE',
        "value" decimal(12,2) NOT NULL,
        "maxDiscount" decimal(12,2),
        "minOrderAmount" decimal(12,2),
        "maxUsage" integer,
        "currentUsage" integer NOT NULL DEFAULT 0,
        "maxUsagePerUser" integer NOT NULL DEFAULT 1,
        "startDate" TIMESTAMP NOT NULL,
        "endDate" TIMESTAMP NOT NULL,
        "allowedCountries" text[] DEFAULT '{}',
        "allowedVehicleTypes" text[] DEFAULT '{}',
        "active" boolean NOT NULL DEFAULT true,
        "createdBy" uuid,
        "metadata" jsonb,
        CONSTRAINT "PK_promos" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_promos_code" UNIQUE ("code")
      );
    `);

    // ========== NOTIFICATIONS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "userId" uuid,
        "audienceGroup" varchar(100),
        "type" "public"."notifications_type_enum" NOT NULL DEFAULT 'CUSTOM',
        "title" varchar(255) NOT NULL,
        "body" text NOT NULL,
        "imageUrl" text,
        "data" jsonb,
        "status" "public"."notifications_status_enum" NOT NULL DEFAULT 'PENDING',
        "sentAt" TIMESTAMP,
        "readAt" TIMESTAMP,
        "failureReason" text,
        "createdBy" uuid,
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_userId_createdAt" ON "notifications" ("userId", "createdAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_notifications_status" ON "notifications" ("status")`);
    await queryRunner.query(`
      ALTER TABLE "notifications"
      ADD CONSTRAINT "FK_notifications_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION
    `);

    // ========== REVIEWS ==========
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "deletedAt" TIMESTAMP,
        "orderId" uuid NOT NULL,
        "customerId" uuid NOT NULL,
        "driverId" uuid NOT NULL,
        "rating" integer NOT NULL DEFAULT 5,
        "comment" text,
        "driverProfessionalism" integer,
        "vehicleCondition" integer,
        "punctuality" integer,
        "communication" integer,
        "flagged" boolean NOT NULL DEFAULT false,
        "flagReason" text,
        "metadata" jsonb,
        CONSTRAINT "PK_reviews" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_reviews_orderId" UNIQUE ("orderId")
      );
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_orderId" ON "reviews" ("orderId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_driverId" ON "reviews" ("driverId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_reviews_customerId" ON "reviews" ("customerId")`);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_orderId" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_customerId" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD CONSTRAINT "FK_reviews_driverId" FOREIGN KEY ("driverId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop tables in reverse dependency order
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "promos" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_locations" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_events" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_documents" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "driver_profiles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "admin_profiles" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "vehicle_types" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "settings" CASCADE`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users" CASCADE`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."notifications_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."promos_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_paymentmethod_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."payments_provider_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."order_events_eventtype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."orders_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."orders_ordertype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."driver_documents_documenttype_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."driver_profiles_availabilitystatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."driver_profiles_kycstatus_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."admin_profiles_adminrole_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "public"."users_role_enum"`);
  }
}
