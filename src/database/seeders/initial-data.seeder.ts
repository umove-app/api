import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { VehicleType } from '../../entities/vehicle-type.entity';
import { Settings } from '../../entities/settings.entity';
import { User } from '../../entities/user.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { UserRole, UserStatus, DriverKycStatus, DriverAvailabilityStatus } from '../../common/enums';
import { AdminRole } from '../../common/enums/user-role.enum';

export class InitialDataSeeder {
  constructor(private dataSource: DataSource) { }

  async run() {
    await this.seedVehicleTypes();
    await this.seedSettings();
    await this.seedAdminUsers();
    await this.seedDrivers();
    console.log('✅ Initial data seeded successfully');
  }

  private async seedVehicleTypes() {
    const vehicleTypeRepo = this.dataSource.getRepository(VehicleType);

    const vehicleTypes = [
      {
        name: 'Motorcycle',
        description: 'Small parcels and documents',
        baseFare: 500,
        perKmRate: 50,
        perMinuteRate: 10,
        minimumFare: 500,
        maxCapacity: 20,
        capacityUnit: 'kg',
        currency: 'NGN',
        availableCountries: ['Nigeria'],
        active: true,
        sortOrder: 1,
      },
      {
        name: 'Sedan',
        description: 'Comfortable ride for up to 4 passengers',
        baseFare: 1000,
        perKmRate: 100,
        perMinuteRate: 20,
        minimumFare: 1000,
        maxCapacity: 200,
        capacityUnit: 'kg',
        currency: 'NGN',
        availableCountries: ['Nigeria'],
        active: true,
        sortOrder: 2,
      },
      {
        name: 'SUV',
        description: 'Spacious vehicle for up to 6 passengers',
        baseFare: 1500,
        perKmRate: 150,
        perMinuteRate: 25,
        minimumFare: 1500,
        maxCapacity: 400,
        capacityUnit: 'kg',
        currency: 'NGN',
        availableCountries: ['Nigeria'],
        active: true,
        sortOrder: 3,
      },
      {
        name: 'Mini Van',
        description: 'Perfect for small moves and deliveries',
        baseFare: 2000,
        perKmRate: 200,
        perMinuteRate: 30,
        minimumFare: 2000,
        maxCapacity: 800,
        capacityUnit: 'kg',
        currency: 'NGN',
        availableCountries: ['Nigeria'],
        active: true,
        sortOrder: 4,
      },
      {
        name: 'Pickup Truck',
        description: 'Large items and furniture',
        baseFare: 3000,
        perKmRate: 250,
        perMinuteRate: 40,
        minimumFare: 3000,
        maxCapacity: 1500,
        capacityUnit: 'kg',
        currency: 'NGN',
        availableCountries: ['Nigeria'],
        active: true,
        sortOrder: 5,
      },
      {
        name: 'Truck',
        description: 'Heavy loads and large moves',
        baseFare: 5000,
        perKmRate: 300,
        perMinuteRate: 50,
        minimumFare: 5000,
        maxCapacity: 3000,
        capacityUnit: 'kg',
        currency: 'NGN',
        availableCountries: ['Nigeria'],
        active: true,
        sortOrder: 6,
      },
    ];

    for (const vt of vehicleTypes) {
      const existing = await vehicleTypeRepo.findOne({ where: { name: vt.name } });
      if (!existing) {
        await vehicleTypeRepo.save(vehicleTypeRepo.create(vt));
      }
    }

    console.log('✅ Vehicle types seeded');
  }

  private async seedSettings() {
    const settingsRepo = this.dataSource.getRepository(Settings);

    // Check if settings already exist
    const existing = await settingsRepo.findOne({ where: {} });

    if (!existing) {
      const defaultSettings = settingsRepo.create({
        vatPercentage: 7.5,
        minimumFare: 500,
        cancellationFeePercentage: 10,
        driverCommissionPercentage: 20,
        maxSearchRadius: 10,
        driverAcceptanceTimeout: 300,
        autoAssignDriver: true,
        supportEmail: 'support@umove.com',
        supportPhone: '+234-800-UMOVE-00',
        supportAddress: 'Lagos, Nigeria',
        companyName: 'UMove Logistics',
        companyAddress: 'Lagos, Nigeria',
      });

      await settingsRepo.save(defaultSettings);
    }

    console.log('✅ Settings seeded');
  }

  private async seedAdminUsers() {
    const userRepo = this.dataSource.getRepository(User);
    const adminProfileRepo = this.dataSource.getRepository(AdminProfile);

    const adminUsers = [
      {
        email: 'superadmin@umove.com',
        password: 'SuperAdmin123!',
        firstName: 'Super',
        lastName: 'Admin',
        name: 'Super Admin',
        phoneNumber: '+2348012345678',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        country: 'Nigeria',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        adminRole: AdminRole.SUPER_ADMIN,
      },
      {
        email: 'admin@umove.com',
        password: 'Admin123!',
        firstName: 'Admin',
        lastName: 'User',
        name: 'Admin User',
        phoneNumber: '+2348012345679',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        country: 'Nigeria',
        isActive: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        adminRole: AdminRole.ADMIN,
      },
    ];

    for (const adminData of adminUsers) {
      const existing = await userRepo.findOne({ where: { email: adminData.email } });

      if (!existing) {
        const hashedPassword = await bcrypt.hash(adminData.password, 10);

        const user = userRepo.create({
          email: adminData.email,
          password: hashedPassword,
          firstName: adminData.firstName,
          lastName: adminData.lastName,
          name: adminData.name,
          phoneNumber: adminData.phoneNumber,
          phone: adminData.phoneNumber,
          role: adminData.role,
          status: adminData.status,
          country: adminData.country,
          isActive: adminData.isActive,
          isEmailVerified: adminData.isEmailVerified,
          isPhoneVerified: adminData.isPhoneVerified,
          emailVerified: adminData.isEmailVerified,
          phoneVerified: adminData.isPhoneVerified,
        });

        const savedUser = await userRepo.save(user);

        // Create admin profile
        const adminProfile = adminProfileRepo.create({
          userId: savedUser.id,
          adminRole: adminData.adminRole,
        });

        await adminProfileRepo.save(adminProfile);

        console.log(`✅ Created admin user: ${adminData.email} (Password: ${adminData.password})`);
      }
    }

    console.log('✅ Admin users seeded');
  }

  private async seedDrivers() {
    const userRepo = this.dataSource.getRepository(User);
    const driverProfileRepo = this.dataSource.getRepository(DriverProfile);

    const drivers = [
      {
        email: 'driver1@umove.com',
        password: 'Driver123!',
        firstName: 'John',
        lastName: 'Driver',
        phoneNumber: '+2348111111111',
        licenseNumber: 'DL-2024-001',
        kycStatus: DriverKycStatus.APPROVED,
      },
      {
        email: 'driver2@umove.com',
        password: 'Driver123!',
        firstName: 'Mary',
        lastName: 'Smith',
        phoneNumber: '+2348111111112',
        licenseNumber: 'DL-2024-002',
        kycStatus: DriverKycStatus.APPROVED,
      },
      {
        email: 'driver3@umove.com',
        password: 'Driver123!',
        firstName: 'Peter',
        lastName: 'Okonkwo',
        phoneNumber: '+2348111111113',
        licenseNumber: 'DL-2024-003',
        kycStatus: DriverKycStatus.PENDING,
      },
    ];

    for (const driverData of drivers) {
      const existing = await userRepo.findOne({ where: { email: driverData.email } });

      if (!existing) {
        const hashedPassword = await bcrypt.hash(driverData.password, 10);

        const user = userRepo.create({
          email: driverData.email,
          password: hashedPassword,
          firstName: driverData.firstName,
          lastName: driverData.lastName,
          name: `${driverData.firstName} ${driverData.lastName}`,
          phoneNumber: driverData.phoneNumber,
          phone: driverData.phoneNumber,
          role: UserRole.DRIVER,
          status: UserStatus.ACTIVE,
          country: 'Nigeria',
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          emailVerified: true,
          phoneVerified: true,
        });

        const savedUser = await userRepo.save(user);

        // Create driver profile
        const driverProfile = driverProfileRepo.create({
          userId: savedUser.id,
          kycStatus: driverData.kycStatus,
          availabilityStatus: DriverAvailabilityStatus.OFFLINE,
          licenseNumber: driverData.licenseNumber,
          rating: 4.5,
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
        });

        await driverProfileRepo.save(driverProfile);

        console.log(`✅ Created driver: ${driverData.email} (Password: ${driverData.password})`);
      }
    }

    console.log('✅ Drivers seeded');
  }
}

// Run seeder if called directly
if (require.main === module) {
  import('../../config/typeorm.config').then(async ({ default: dataSource }) => {
    try {
      await dataSource.initialize();
      const seeder = new InitialDataSeeder(dataSource);
      await seeder.run();
      await dataSource.destroy();
    } catch (error) {
      console.error('Error running seeder:', error);
      process.exit(1);
    }
  });
}

