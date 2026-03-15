import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan } from 'typeorm';
import { User } from '../../entities/user.entity';
import { Order } from '../../entities/order.entity';
import { Payment } from '../../entities/payment.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { VehicleType } from '../../entities/vehicle-type.entity';
import { Review } from '../../entities/review.entity';
import {
  DriverAvailabilityStatus,
  DriverKycStatus,
  OrderStatus,
  PaymentStatus,
  UserRole,
} from '../../common/enums';
import {
  DashboardStatsDto,
  UserRegistrationStatsDto,
  PaymentStatsDto,
  PaymentAnalyticsDto,
  OrderStatsDto,
  DriverPerformanceDto,
  VehicleUtilizationDto,
} from './dto/admin-stats.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
    @InjectRepository(VehicleType)
    private vehicleTypeRepository: Repository<VehicleType>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
  ) { }

  // Dashboard Statistics
  async getDashboardStats(): Promise<DashboardStatsDto> {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      totalUsers,
      totalDrivers,
      totalOrders,
      activeOrders,
      activeDrivers,
      pendingDriverVerifications,
      todayOrders,
      monthlyOrders,
    ] = await Promise.all([
      this.userRepository.count({ where: { role: UserRole.CUSTOMER } }),
      this.userRepository.count({ where: { role: UserRole.DRIVER } }),
      this.orderRepository.count(),
      this.orderRepository.count({
        where: [
          { status: OrderStatus.STARTED },
          { status: OrderStatus.EN_ROUTE_TO_PICKUP },
          { status: OrderStatus.ARRIVED_AT_PICKUP },
        ],
      }),
      this.driverProfileRepository.count({
        where: { availabilityStatus: DriverAvailabilityStatus.ONLINE },
      }),
      this.driverProfileRepository.count({
        where: { kycStatus: DriverKycStatus.PENDING },
      }),
      this.orderRepository.count({ where: { createdAt: MoreThan(todayStart) } }),
      this.orderRepository.count({ where: { createdAt: MoreThan(monthStart) } }),
    ]);

    // Calculate revenue
    const completedPayments = await this.paymentRepository.find({
      where: { status: PaymentStatus.SUCCESS },
    });

    const totalRevenue = completedPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const todayPayments = completedPayments.filter((p) => p.createdAt >= todayStart);
    const todayRevenue = todayPayments.reduce((sum, payment) => sum + payment.amount, 0);

    const monthlyPayments = completedPayments.filter((p) => p.createdAt >= monthStart);
    const monthlyRevenue = monthlyPayments.reduce((sum, payment) => sum + payment.amount, 0);

    return {
      totalUsers,
      totalDrivers,
      totalOrders,
      totalRevenue,
      activeOrders,
      activeDrivers,
      pendingDriverVerifications,
      todayOrders,
      todayRevenue,
      monthlyOrders,
      monthlyRevenue,
    };
  }

  // User Registration Analytics
  async getUserRegistrationStats(startDate: Date, endDate: Date): Promise<UserRegistrationStatsDto[]> {
    const users = await this.userRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      select: ['createdAt', 'role'],
    });

    const statsMap = new Map<string, { customers: number; drivers: number }>();

    users.forEach((user) => {
      const date = user.createdAt.toISOString().split('T')[0];
      if (!statsMap.has(date)) {
        statsMap.set(date, { customers: 0, drivers: 0 });
      }

      const stats = statsMap.get(date)!;
      if (user.role === UserRole.CUSTOMER) {
        stats.customers++;
      } else if (user.role === UserRole.DRIVER) {
        stats.drivers++;
      }
    });

    return Array.from(statsMap.entries())
      .map(([date, stats]) => ({
        date,
        customers: stats.customers,
        drivers: stats.drivers,
        total: stats.customers + stats.drivers,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Payment Analytics
  async getPaymentStats(startDate: Date, endDate: Date): Promise<PaymentAnalyticsDto> {
    // Get current period payments
    const currentPayments = await this.paymentRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
        status: PaymentStatus.SUCCESS,
      },
    });

    // Get previous period (same duration) for comparison
    const periodDuration = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodDuration);
    const previousEndDate = new Date(startDate.getTime());

    const previousPayments = await this.paymentRepository.find({
      where: {
        createdAt: Between(previousStartDate, previousEndDate),
        status: PaymentStatus.SUCCESS,
      },
    });

    // Calculate current period stats
    const currentPaystackRevenue = currentPayments
      .filter((p) => p.provider === 'PAYSTACK')
      .reduce((sum, p) => sum + p.amount, 0);

    const currentStripeRevenue = currentPayments
      .filter((p) => p.provider === 'STRIPE')
      .reduce((sum, p) => sum + p.amount, 0);

    const currentTotalRevenue = currentPaystackRevenue + currentStripeRevenue;

    // Calculate previous period stats
    const previousPaystackRevenue = previousPayments
      .filter((p) => p.provider === 'PAYSTACK')
      .reduce((sum, p) => sum + p.amount, 0);

    const previousStripeRevenue = previousPayments
      .filter((p) => p.provider === 'STRIPE')
      .reduce((sum, p) => sum + p.amount, 0);

    const previousTotalRevenue = previousPaystackRevenue + previousStripeRevenue;

    // Build detailed payment breakdown
    const statsMap = new Map<string, { amount: number; count: number; provider: string }>();

    currentPayments.forEach((payment) => {
      const date = payment.createdAt.toISOString().split('T')[0];
      const key = `${date}-${payment.provider}`;

      if (!statsMap.has(key)) {
        statsMap.set(key, { amount: 0, count: 0, provider: payment.provider });
      }

      const stats = statsMap.get(key)!;
      stats.amount += payment.amount;
      stats.count++;
    });

    const payments: PaymentStatsDto[] = Array.from(statsMap.entries())
      .map(([key, stats]) => ({
        date: key.split('-').slice(0, 3).join('-'),
        amount: stats.amount,
        count: stats.count,
        provider: stats.provider,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalRevenue: currentTotalRevenue,
      totalTransactions: currentPayments.length,
      paystackRevenue: currentPaystackRevenue,
      stripeRevenue: currentStripeRevenue,
      previousTotalRevenue,
      previousTotalTransactions: previousPayments.length,
      previousPaystackRevenue,
      previousStripeRevenue,
      payments,
    };
  }

  // Order Analytics
  async getOrderStats(startDate: Date, endDate: Date): Promise<OrderStatsDto[]> {
    const orders = await this.orderRepository.find({
      where: {
        createdAt: Between(startDate, endDate),
      },
      relations: ['payment'],
    });

    const statsMap = new Map<string, { completed: number; cancelled: number; total: number; revenue: number }>();

    orders.forEach((order) => {
      const date = order.createdAt.toISOString().split('T')[0];

      if (!statsMap.has(date)) {
        statsMap.set(date, { completed: 0, cancelled: 0, total: 0, revenue: 0 });
      }

      const stats = statsMap.get(date)!;
      stats.total++;

      if (order.status === OrderStatus.COMPLETED) {
        stats.completed++;
        if (order.payment && order.payment.status === PaymentStatus.SUCCESS) {
          stats.revenue += order.payment.amount;
        }
      } else if (order.status === OrderStatus.CANCELLED) {
        stats.cancelled++;
      }
    });

    return Array.from(statsMap.entries())
      .map(([date, stats]) => ({
        date,
        completed: stats.completed,
        cancelled: stats.cancelled,
        total: stats.total,
        revenue: stats.revenue,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // Driver Performance Analytics
  async getDriverPerformance(startDate?: Date, endDate?: Date): Promise<DriverPerformanceDto[]> {
    const whereClause = startDate && endDate ? { createdAt: Between(startDate, endDate) } : {};

    const orders = await this.orderRepository.find({
      where: whereClause,
      relations: ['driver', 'payment'],
    });

    const driverStatsMap = new Map<
      string,
      {
        driverName: string;
        totalTrips: number;
        completedTrips: number;
        cancelledTrips: number;
        totalEarnings: number;
      }
    >();

    orders.forEach((order) => {
      if (!order.driverId) return;

      if (!driverStatsMap.has(order.driverId)) {
        driverStatsMap.set(order.driverId, {
          driverName: order.driver ? `${order.driver.firstName} ${order.driver.lastName}` : 'Unknown',
          totalTrips: 0,
          completedTrips: 0,
          cancelledTrips: 0,
          totalEarnings: 0,
        });
      }

      const stats = driverStatsMap.get(order.driverId)!;
      stats.totalTrips++;

      if (order.status === OrderStatus.COMPLETED) {
        stats.completedTrips++;
        if (order.payment && order.payment.status === PaymentStatus.SUCCESS) {
          stats.totalEarnings += order.payment.amount;
        }
      } else if (order.status === OrderStatus.CANCELLED) {
        stats.cancelledTrips++;
      }
    });

    // Get driver ratings
    const driverPerformance: DriverPerformanceDto[] = [];

    for (const [driverId, stats] of driverStatsMap.entries()) {
      const reviews = await this.reviewRepository.find({ where: { driverId } });
      const averageRating = reviews.length > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length : 0;

      driverPerformance.push({
        driverId,
        driverName: stats.driverName,
        totalTrips: stats.totalTrips,
        completedTrips: stats.completedTrips,
        cancelledTrips: stats.cancelledTrips,
        totalEarnings: stats.totalEarnings,
        averageRating: Math.round(averageRating * 10) / 10,
        onlineHours: 0, // TODO: Implement time tracking
      });
    }

    return driverPerformance.sort((a, b) => b.totalEarnings - a.totalEarnings);
  }

  // Vehicle Utilization Analytics
  async getVehicleUtilization(startDate?: Date, endDate?: Date): Promise<VehicleUtilizationDto[]> {
    const whereClause = startDate && endDate ? { createdAt: Between(startDate, endDate) } : {};

    const orders = await this.orderRepository.find({
      where: whereClause,
      relations: ['vehicleTypeEntity', 'payment'],
    });

    const vehicleStatsMap = new Map<
      string,
      {
        vehicleTypeName: string;
        totalOrders: number;
        totalRevenue: number;
      }
    >();

    orders.forEach((order) => {
      if (!order.vehicleTypeId) return;

      if (!vehicleStatsMap.has(order.vehicleTypeId)) {
        vehicleStatsMap.set(order.vehicleTypeId, {
          vehicleTypeName: order.vehicleTypeEntity?.name || 'Unknown',
          totalOrders: 0,
          totalRevenue: 0,
        });
      }

      const stats = vehicleStatsMap.get(order.vehicleTypeId)!;
      stats.totalOrders++;

      if (order.status === OrderStatus.COMPLETED && order.payment && order.payment.status === PaymentStatus.SUCCESS) {
        stats.totalRevenue += order.payment.amount;
      }
    });

    const totalOrders = orders.length;

    return Array.from(vehicleStatsMap.entries())
      .map(([vehicleTypeId, stats]) => ({
        vehicleTypeId,
        vehicleTypeName: stats.vehicleTypeName,
        totalOrders: stats.totalOrders,
        totalRevenue: stats.totalRevenue,
        utilizationRate: totalOrders > 0 ? (stats.totalOrders / totalOrders) * 100 : 0,
      }))
      .sort((a, b) => b.totalOrders - a.totalOrders);
  }

  // User Management
  async getAllUsers(page: number = 1, limit: number = 20, role?: UserRole, search?: string) {
    let users: User[] = [];
    let total = 0;

    try {
      // Build where clause
      const whereClause: any = {};
      if (role) {
        whereClause.role = role;
      }

      // Use find method with proper filtering
      const allUsers = await this.userRepository.find({
        where: whereClause,
        order: { createdAt: 'DESC' },
      });

      // Apply search filter if provided
      let filteredUsers = allUsers;
      if (search) {
        const searchLower = search.toLowerCase();
        filteredUsers = allUsers.filter(
          (u) =>
            u.firstName?.toLowerCase().includes(searchLower) ||
            u.lastName?.toLowerCase().includes(searchLower) ||
            u.email?.toLowerCase().includes(searchLower) ||
            u.phoneNumber?.toLowerCase().includes(searchLower),
        );
      }

      // Set total AFTER filtering
      total = filteredUsers.length;

      // Apply pagination
      users = filteredUsers.slice((page - 1) * limit, page * limit);

      // Load driver profiles for users if filtering by DRIVER role or if we have drivers
      const driverUsers = users.filter(u => u.role === UserRole.DRIVER);
      if (driverUsers.length > 0) {
        const userIds = driverUsers.map((u) => u.id);
        const profiles = await this.driverProfileRepository
          .createQueryBuilder('profile')
          .where('profile.userId IN (:...userIds)', { userIds })
          .getMany();

        const profileMap = new Map<string, any>();
        profiles.forEach((p) => {
          profileMap.set(p.userId, p);
        });

        users.forEach((u) => {
          if (u.role === UserRole.DRIVER) {
            const p = profileMap.get(u.id);
            if (p) u.driverProfile = p;
          }
        });
      }
    } catch (error) {
      console.error('getAllUsers error:', error);
      users = [];
      total = 0;
    }

    return {
      data: users,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUserById(id: string) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['driverProfile', 'driverProfile.vehicles'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateUser(id: string, dto: UpdateUserDto) {
    const user = await this.getUserById(id);

    Object.assign(user, dto);

    return this.userRepository.save(user);
  }

  async suspendUser(id: string, reason: string) {
    const user = await this.getUserById(id);

    user.isActive = false;

    await this.userRepository.save(user);

    return { message: 'User suspended successfully', reason };
  }

  async activateUser(id: string) {
    const user = await this.getUserById(id);

    user.isActive = true;

    await this.userRepository.save(user);

    return { message: 'User activated successfully' };
  }

  async deleteUser(id: string) {
    const user = await this.getUserById(id);

    // Check if user has active orders
    const activeOrders = await this.orderRepository.count({
      where: [
        { customerId: id, status: OrderStatus.STARTED },
        { driverId: id, status: OrderStatus.STARTED },
      ],
    });

    if (activeOrders > 0) {
      throw new BadRequestException('Cannot delete user with active orders');
    }

    await this.userRepository.remove(user);

    return { message: 'User deleted successfully' };
  }

  // Order Management
  async getAllOrders(
    page: number = 1,
    limit: number = 20,
    status?: OrderStatus,
    startDate?: Date,
    endDate?: Date,
  ) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.driver', 'driver')
      .leftJoinAndSelect('order.vehicleTypeEntity', 'vehicleType')
      .leftJoinAndSelect('order.payment', 'payment');

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    if (startDate && endDate) {
      query.andWhere('order.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate });
    }

    query
      .orderBy('order.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [orders, total] = await query.getManyAndCount();

    return {
      data: orders,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(id: string) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: ['customer', 'driver', 'vehicleTypeEntity', 'payment', 'review', 'events'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return order;
  }

  // Driver Monitoring
  async getActiveDrivers() {
    const drivers = await this.driverProfileRepository.find({
      where: { availabilityStatus: DriverAvailabilityStatus.ONLINE },
      relations: ['user', 'vehicles'],
    });

    return drivers.map((driver) => ({
      driverId: driver.userId,
      driverName: `${driver.user.firstName} ${driver.user.lastName}`,
      phoneNumber: driver.user.phoneNumber,
      vehicleType: driver.vehicle?.type || 'N/A',
      latitude: driver.lastKnownLatitude,
      longitude: driver.lastKnownLongitude,
      lastLocationUpdate: driver.lastLocationUpdate,
    }));
  }

  async getDriverCurrentOrder(driverId: string) {
    const order = await this.orderRepository.findOne({
      where: {
        driverId,
        status: OrderStatus.STARTED,
      },
      relations: ['customer', 'vehicleTypeEntity'],
    });

    return order;
  }

  // Vehicle Type Management
  async getAllVehicleTypes(page: number = 1, limit: number = 20) {
    const query = this.vehicleTypeRepository.createQueryBuilder('vt');

    const [vehicles, total] = await query
      .orderBy('vt.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      data: vehicles,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getVehicleTypeById(id: string) {
    const vehicleType = await this.vehicleTypeRepository.findOne({
      where: { id },
    });

    if (!vehicleType) {
      throw new NotFoundException('Vehicle type not found');
    }

    return vehicleType;
  }

  async createVehicleType(dto: any) {
    const vehicleType = this.vehicleTypeRepository.create({
      name: dto.name,
      description: dto.description,
      baseFare: dto.basePrice || dto.baseFare,
      perKmRate: dto.pricePerKm || dto.perKmRate,
      maxCapacity: dto.capacity || dto.maxCapacity,
      availableCountries: dto.availableCountries || [],
      active: dto.isActive !== false,
      icon: dto.imageUrl || dto.icon,
    });

    return this.vehicleTypeRepository.save(vehicleType);
  }

  async updateVehicleType(id: string, dto: any) {
    const vehicleType = await this.getVehicleTypeById(id);

    if (dto.name !== undefined) vehicleType.name = dto.name;
    if (dto.description !== undefined) vehicleType.description = dto.description;
    if (dto.capacity !== undefined || dto.maxCapacity !== undefined) vehicleType.maxCapacity = dto.capacity || dto.maxCapacity;
    if (dto.basePrice !== undefined || dto.baseFare !== undefined) vehicleType.baseFare = dto.basePrice || dto.baseFare;
    if (dto.pricePerKm !== undefined || dto.perKmRate !== undefined) vehicleType.perKmRate = dto.pricePerKm || dto.perKmRate;
    if (dto.availableCountries !== undefined) vehicleType.availableCountries = dto.availableCountries;
    if (dto.isActive !== undefined) vehicleType.active = dto.isActive;
    if (dto.imageUrl !== undefined || dto.icon !== undefined) vehicleType.icon = dto.imageUrl || dto.icon;

    return this.vehicleTypeRepository.save(vehicleType);
  }

  async deleteVehicleType(id: string) {
    const vehicleType = await this.getVehicleTypeById(id);

    // Check if vehicle type is in use
    const orderCount = await this.orderRepository.count({
      where: { vehicleTypeId: id },
    });

    if (orderCount > 0) {
      throw new BadRequestException(
        `Cannot delete vehicle type with ${orderCount} active orders. Please deactivate it instead.`,
      );
    }

    await this.vehicleTypeRepository.remove(vehicleType);

    return { message: 'Vehicle type deleted successfully' };
  }
}
