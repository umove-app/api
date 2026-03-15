export interface DashboardStatsDto {
  totalUsers: number;
  totalDrivers: number;
  totalOrders: number;
  totalRevenue: number;
  activeOrders: number;
  activeDrivers: number;
  pendingDriverVerifications: number;
  todayOrders: number;
  todayRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

export interface UserRegistrationStatsDto {
  date: string;
  customers: number;
  drivers: number;
  total: number;
}

export interface PaymentStatsDto {
  date: string;
  amount: number;
  count: number;
  provider: string;
}

export interface PaymentAnalyticsDto {
  totalRevenue: number;
  totalTransactions: number;
  paystackRevenue: number;
  stripeRevenue: number;
  previousTotalRevenue?: number;
  previousTotalTransactions?: number;
  previousPaystackRevenue?: number;
  previousStripeRevenue?: number;
  payments: PaymentStatsDto[];
}

export interface OrderStatsDto {
  date: string;
  completed: number;
  cancelled: number;
  total: number;
  revenue: number;
}

export interface DriverPerformanceDto {
  driverId: string;
  driverName: string;
  totalTrips: number;
  completedTrips: number;
  cancelledTrips: number;
  totalEarnings: number;
  averageRating: number;
  onlineHours: number;
}

export interface VehicleUtilizationDto {
  vehicleTypeId: string;
  vehicleTypeName: string;
  totalOrders: number;
  totalRevenue: number;
  utilizationRate: number;
}
