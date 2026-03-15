import { Injectable, NotFoundException, BadRequestException, ForbiddenException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { DriverDocument } from '../../entities/driver-document.entity';
import { Vehicle } from '../../entities/vehicle.entity';
import { Order } from '../../entities/order.entity';
import { OrderEvent } from '../../entities/order-event.entity';
import { User } from '../../entities/user.entity';
import { UpdateAvailabilityDto } from './dto/update-availability.dto';
import { AcceptOrderDto } from './dto/accept-order.dto';
import { DeclineOrderDto } from './dto/decline-order.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';
import { OrderStatus, OrderEventType, DriverAvailabilityStatus, UserRole, DriverKycStatus, DocumentType } from '../../common/enums';
import { S3UploadService } from '../../common/services/s3-upload.service';

@Injectable()
export class DriversService {
  constructor(
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
    @InjectRepository(DriverDocument)
    private driverDocumentRepository: Repository<DriverDocument>,
    @InjectRepository(Vehicle)
    private vehicleRepository: Repository<Vehicle>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderEvent)
    private orderEventRepository: Repository<OrderEvent>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private s3UploadService: S3UploadService,
  ) { }

  async updateAvailability(userId: string, dto: UpdateAvailabilityDto) {
    const driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    if (driver.kycStatus !== 'APPROVED') {
      throw new BadRequestException('Driver KYC must be approved to go online');
    }

    // Check if driver has active orders
    if (dto.status === DriverAvailabilityStatus.OFFLINE) {
      const activeOrders = await this.orderRepository.count({
        where: {
          driverId: userId,
          status: OrderStatus.STARTED,
        },
      });

      if (activeOrders > 0) {
        throw new BadRequestException('Cannot go offline while on active trip');
      }
    }

    driver.availabilityStatus = dto.status;
    driver.onlineAt = dto.status === DriverAvailabilityStatus.ONLINE ? new Date() : driver.onlineAt;
    driver.offlineAt = dto.status === DriverAvailabilityStatus.OFFLINE ? new Date() : driver.offlineAt;

    await this.driverProfileRepository.save(driver);

    return {
      message: `Driver is now ${dto.status.toLowerCase()}`,
      status: dto.status,
    };
  }

  async getDriverOrders(userId: string, status?: OrderStatus) {
    const query = this.orderRepository
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.vehicle', 'vehicle')
      .where('order.driverId = :userId', { userId });

    if (status) {
      query.andWhere('order.status = :status', { status });
    }

    query.orderBy('order.createdAt', 'DESC');

    return await query.getMany();
  }

  async acceptOrder(userId: string, orderId: string, dto: AcceptOrderDto) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId !== userId) {
      throw new ForbiddenException('This order is not assigned to you');
    }

    if (order.status !== OrderStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException('Order cannot be accepted in current status');
    }

    order.status = OrderStatus.EN_ROUTE_TO_PICKUP;
    order.acceptedAt = new Date();

    await this.orderRepository.save(order);

    // Create event
    const message = dto.message || 'Driver accepted the order';
    await this.createOrderEvent(orderId, OrderEventType.DRIVER_ACCEPTED, message, userId);

    return order;
  }

  async declineOrder(userId: string, orderId: string, dto: DeclineOrderDto) {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId !== userId) {
      throw new ForbiddenException('This order is not assigned to you');
    }

    if (order.status !== OrderStatus.DRIVER_ASSIGNED) {
      throw new BadRequestException('Order cannot be declined in current status');
    }

    // Unassign driver
    order.driverId = null;
    order.vehicleId = null;
    order.status = OrderStatus.CREATED;

    await this.orderRepository.save(order);

    // Update driver availability
    await this.driverProfileRepository.update({ userId }, { availabilityStatus: DriverAvailabilityStatus.ONLINE });

    // Create event
    await this.createOrderEvent(orderId, OrderEventType.DRIVER_DECLINED, `Driver declined: ${dto.reason}`, userId);

    return { message: 'Order declined successfully' };
  }

  async arrivedAtPickup(userId: string, orderId: string) {
    const order = await this.validateDriverOrder(userId, orderId, OrderStatus.EN_ROUTE_TO_PICKUP);

    order.status = OrderStatus.PICKED_UP;
    order.arrivedAtPickupAt = new Date();

    await this.orderRepository.save(order);
    await this.createOrderEvent(orderId, OrderEventType.ARRIVED_AT_PICKUP, 'Driver arrived at pickup location', userId);

    return order;
  }

  async startTrip(userId: string, orderId: string) {
    const order = await this.validateDriverOrder(userId, orderId, OrderStatus.PICKED_UP);

    order.status = OrderStatus.STARTED;
    order.startedAt = new Date();
    order.pickedUpAt = new Date();

    await this.orderRepository.save(order);
    await this.createOrderEvent(orderId, OrderEventType.STARTED, 'Trip started', userId);

    return order;
  }

  async completeTrip(userId: string, orderId: string) {
    const order = await this.validateDriverOrder(userId, orderId, OrderStatus.STARTED);

    order.status = OrderStatus.DELIVERED;
    order.deliveredAt = new Date();
    order.arrivedAtDestinationAt = new Date();

    await this.orderRepository.save(order);
    await this.createOrderEvent(orderId, OrderEventType.DELIVERED, 'Trip completed', userId);

    // Update driver availability
    await this.driverProfileRepository.update({ userId }, { availabilityStatus: DriverAvailabilityStatus.ONLINE });

    // Increment trip counters
    await this.driverProfileRepository.increment({ userId }, 'totalTrips', 1);
    await this.driverProfileRepository.increment({ userId }, 'completedTrips', 1);

    return order;
  }

  private async validateDriverOrder(userId: string, orderId: string, expectedStatus: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.driverId !== userId) {
      throw new ForbiddenException('This order is not assigned to you');
    }

    if (order.status !== expectedStatus) {
      throw new BadRequestException(`Order must be in ${expectedStatus} status`);
    }

    return order;
  }

  private async createOrderEvent(orderId: string, eventType: OrderEventType, message: string, performedBy: string) {
    const event = this.orderEventRepository.create({
      orderId,
      eventType,
      message,
      performedBy,
      performedByRole: UserRole.DRIVER,
    });

    await this.orderEventRepository.save(event);
  }

  // ============= Admin Driver Management Methods =============

  async getAllDrivers(page = 1, limit = 20, status?: string) {
    const query = this.driverProfileRepository
      .createQueryBuilder('driver')
      .leftJoinAndSelect('driver.user', 'user')
      .leftJoinAndSelect('driver.vehicles', 'vehicles')
      .leftJoinAndSelect('driver.documents', 'documents');

    // Filter by verification status (maps to KYC status)
    if (status) {
      const upperStatus = status.toUpperCase();
      // Map VerificationStatus to DriverKycStatus
      if (upperStatus === 'VERIFIED') {
        query.andWhere('driver.kycStatus = :kycStatus', { kycStatus: DriverKycStatus.APPROVED });
      } else if (upperStatus === 'REJECTED') {
        query.andWhere('driver.kycStatus = :kycStatus', { kycStatus: DriverKycStatus.REJECTED });
      } else if (upperStatus === 'PENDING') {
        query.andWhere('driver.kycStatus = :kycStatus', { kycStatus: DriverKycStatus.PENDING });
      }
    }

    // Apply pagination
    const skip = (page - 1) * limit;
    query.skip(skip).take(limit);

    // Order by creation date
    query.orderBy('driver.createdAt', 'DESC');

    const [drivers, total] = await query.getManyAndCount();

    // Transform the response to match frontend expectations
    const transformedData = drivers.map(driver => {
      // Extract document URLs from documents array
      const licenseDoc = driver.documents?.find(doc => doc.documentType === 'DRIVERS_LICENSE');
      const vehicleRegDoc = driver.documents?.find(doc => doc.documentType === 'VEHICLE_REGISTRATION');
      const insuranceDoc = driver.documents?.find(doc => doc.documentType === 'VEHICLE_INSURANCE');

      // Create the driverProfile object
      const driverProfile = {
        userId: driver.userId,
        licenseNumber: driver.licenseNumber,
        licenseUrl: licenseDoc?.documentUrl || null,
        vehicleRegistrationUrl: vehicleRegDoc?.documentUrl || null,
        insuranceUrl: insuranceDoc?.documentUrl || null,
        verificationStatus: driver.verificationStatus, // Uses the getter that maps APPROVED -> VERIFIED
        isOnline: driver.isOnline, // Uses the getter that checks availabilityStatus
        lastKnownLatitude: driver.lastKnownLatitude,
        lastKnownLongitude: driver.lastKnownLongitude,
        lastLocationUpdate: driver.lastLocationUpdate,
        rejectionReason: driver.rejectionReason,
        vehicle: driver.vehicle, // Uses the getter that returns vehicles[0]
      };

      // Return user object with nested driverProfile (matching frontend User interface)
      return {
        ...driver.user,
        driverProfile,
      };
    });

    return {
      data: transformedData,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getDriverById(driverId: string) {
    const driver = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
      relations: ['user', 'vehicles', 'documents'],
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Extract document URLs from documents array
    const licenseDoc = driver.documents?.find(doc => doc.documentType === 'DRIVERS_LICENSE');
    const vehicleRegDoc = driver.documents?.find(doc => doc.documentType === 'VEHICLE_REGISTRATION');
    const insuranceDoc = driver.documents?.find(doc => doc.documentType === 'VEHICLE_INSURANCE');

    // Create the driverProfile object
    const driverProfile = {
      userId: driver.userId,
      licenseNumber: driver.licenseNumber,
      licenseUrl: licenseDoc?.documentUrl || null,
      vehicleRegistrationUrl: vehicleRegDoc?.documentUrl || null,
      insuranceUrl: insuranceDoc?.documentUrl || null,
      verificationStatus: driver.verificationStatus,
      isOnline: driver.isOnline,
      lastKnownLatitude: driver.lastKnownLatitude,
      lastKnownLongitude: driver.lastKnownLongitude,
      lastLocationUpdate: driver.lastLocationUpdate,
      rejectionReason: driver.rejectionReason,
      vehicle: driver.vehicle,
    };

    // Return user object with nested driverProfile
    return {
      ...driver.user,
      driverProfile,
    };
  }

  async verifyDriver(driverId: string, approvedBy: string) {
    const driver = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update KYC status to approved
    driver.kycStatus = DriverKycStatus.APPROVED;
    driver.approvedAt = new Date();
    driver.approvedBy = approvedBy;
    driver.rejectionReason = null as any; // Clear any previous rejection reason

    await this.driverProfileRepository.save(driver);

    return {
      message: 'Driver verified successfully',
      driver: {
        id: driver.userId,
        kycStatus: driver.kycStatus,
        verificationStatus: driver.verificationStatus,
        approvedAt: driver.approvedAt,
      },
    };
  }

  async rejectDriver(driverId: string, reason: string, rejectedBy: string) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Rejection reason is required');
    }

    const driver = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Update KYC status to rejected
    driver.kycStatus = DriverKycStatus.REJECTED;
    driver.rejectionReason = reason;
    driver.approvedAt = null as any;
    driver.approvedBy = null as any;

    await this.driverProfileRepository.save(driver);

    return {
      message: 'Driver rejected successfully',
      driver: {
        id: driver.userId,
        kycStatus: driver.kycStatus,
        verificationStatus: driver.verificationStatus,
        rejectionReason: driver.rejectionReason,
      },
    };
  }

  async suspendDriver(driverId: string, reason: string, suspendedBy: string) {
    if (!reason || reason.trim() === '') {
      throw new BadRequestException('Suspension reason is required');
    }

    const driver = await this.driverProfileRepository.findOne({
      where: { userId: driverId },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Check if driver has active orders
    const activeOrders = await this.orderRepository.count({
      where: {
        driverId: driverId,
        status: OrderStatus.STARTED,
      },
    });

    if (activeOrders > 0) {
      throw new BadRequestException('Cannot suspend driver with active trips');
    }

    // Update driver status
    driver.availabilityStatus = DriverAvailabilityStatus.OFFLINE;

    // Store suspension info in metadata
    const suspensionInfo = {
      suspendedAt: new Date().toISOString(),
      suspendedBy: suspendedBy,
      suspensionReason: reason,
      isSuspended: true,
    };

    driver.metadata = {
      ...driver.metadata,
      suspension: suspensionInfo,
    };

    await this.driverProfileRepository.save(driver);

    // Also update the user's isActive status
    await this.userRepository.update(
      { id: driverId },
      { isActive: false },
    );

    return {
      message: 'Driver suspended successfully',
      driver: {
        id: driver.userId,
        availabilityStatus: driver.availabilityStatus,
        suspensionReason: reason,
        suspendedAt: suspensionInfo.suspendedAt,
      },
    };
  }

  // ============= Driver Document Management Methods =============

  async uploadDocument(userId: string, dto: UploadDocumentDto) {
    // Get or create driver profile
    let driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      // Create driver profile if it doesn't exist
      driver = this.driverProfileRepository.create({
        userId,
        kycStatus: DriverKycStatus.PENDING,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      });
      await this.driverProfileRepository.save(driver);
    }

    // Check if document of this type already exists
    const existingDoc = await this.driverDocumentRepository.findOne({
      where: { driverId: driver.id, documentType: dto.documentType },
    });

    // Upload to S3
    const contentType = dto.contentType || 'image/jpeg';
    const uploadResult = await this.s3UploadService.uploadDriverDocument(
      userId,
      dto.documentType,
      dto.fileData,
      contentType,
    );

    if (existingDoc) {
      // Update existing document
      existingDoc.documentUrl = uploadResult.url;
      existingDoc.documentNumber = dto.documentNumber || existingDoc.documentNumber;
      existingDoc.expiryDate = dto.expiryDate ? new Date(dto.expiryDate) : existingDoc.expiryDate;
      existingDoc.verified = false; // Reset verification
      existingDoc.verifiedAt = null as any;
      existingDoc.verifiedBy = null as any;

      await this.driverDocumentRepository.save(existingDoc);
      return existingDoc;
    }

    // Create new document
    const document = this.driverDocumentRepository.create({
      driverId: driver.id,
      documentType: dto.documentType,
      documentUrl: uploadResult.url,
      documentNumber: dto.documentNumber,
      expiryDate: dto.expiryDate ? new Date(dto.expiryDate) : undefined,
      verified: false,
    });

    await this.driverDocumentRepository.save(document);

    // Update KYC status to under review if pending
    if (driver.kycStatus === DriverKycStatus.PENDING) {
      driver.kycStatus = DriverKycStatus.UNDER_REVIEW;
      await this.driverProfileRepository.save(driver);
    }

    return document;
  }

  async getDriverDocuments(userId: string) {
    const driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      return [];
    }

    return this.driverDocumentRepository.find({
      where: { driverId: driver.id },
      order: { createdAt: 'DESC' },
    });
  }

  async deleteDocument(userId: string, documentId: string) {
    const driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const document = await this.driverDocumentRepository.findOne({
      where: { id: documentId, driverId: driver.id },
    });

    if (!document) {
      throw new NotFoundException('Document not found');
    }

    // Delete from S3 if needed (extract key from URL)
    // For now, we'll just soft delete by removing from DB
    await this.driverDocumentRepository.remove(document);

    return { message: 'Document deleted successfully' };
  }

  // ============= Driver Vehicle Management Methods =============

  async createVehicle(userId: string, dto: CreateVehicleDto) {
    // Get or create driver profile
    let driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      driver = this.driverProfileRepository.create({
        userId,
        kycStatus: DriverKycStatus.PENDING,
        availabilityStatus: DriverAvailabilityStatus.OFFLINE,
      });
      await this.driverProfileRepository.save(driver);
    }

    // Check for duplicate plate number
    const existingVehicle = await this.vehicleRepository.findOne({
      where: { plateNumber: dto.plateNumber },
    });

    if (existingVehicle && existingVehicle.driverId !== driver.id) {
      throw new ConflictException('Vehicle with this plate number already exists');
    }

    // Upload photos to S3
    const photoUrls: string[] = [];
    if (dto.photos && dto.photos.length > 0) {
      for (const photoData of dto.photos) {
        const result = await this.s3UploadService.uploadVehiclePhoto(
          userId,
          'temp',
          photoData,
          'image/jpeg',
        );
        photoUrls.push(result.url);
      }
    }

    // Upload documents to S3
    let registrationUrl: string | null = null;
    let insuranceUrl: string | null = null;
    let roadworthinessUrl: string | null = null;

    if (dto.registrationDocument) {
      const result = await this.s3UploadService.uploadDriverDocument(
        userId,
        'vehicle_registration',
        dto.registrationDocument,
        'image/jpeg',
      );
      registrationUrl = result.url;
    }

    if (dto.insuranceDocument) {
      const result = await this.s3UploadService.uploadDriverDocument(
        userId,
        'vehicle_insurance',
        dto.insuranceDocument,
        'image/jpeg',
      );
      insuranceUrl = result.url;
    }

    if (dto.roadworthinessDocument) {
      const result = await this.s3UploadService.uploadDriverDocument(
        userId,
        'roadworthiness',
        dto.roadworthinessDocument,
        'image/jpeg',
      );
      roadworthinessUrl = result.url;
    }

    // Create vehicle
    const vehicleData = {
      driverId: driver.id,
      type: dto.type,
      make: dto.make,
      model: dto.model,
      year: dto.year,
      color: dto.color,
      plateNumber: dto.plateNumber,
      capacity: dto.capacity || 200,
      capacityUnit: dto.capacityUnit || 'kg',
      photos: photoUrls,
      registrationDocument: registrationUrl,
      insuranceDocument: insuranceUrl,
      insuranceExpiryDate: dto.insuranceExpiryDate ? new Date(dto.insuranceExpiryDate) : undefined,
      roadworthinessDocument: roadworthinessUrl,
      roadworthinessExpiryDate: dto.roadworthinessExpiryDate ? new Date(dto.roadworthinessExpiryDate) : undefined,
      verified: false,
      active: true,
    };
    const vehicle = this.vehicleRepository.create(vehicleData as any);

    await this.vehicleRepository.save(vehicle);

    // Update KYC status to under review if pending
    if (driver.kycStatus === DriverKycStatus.PENDING) {
      driver.kycStatus = DriverKycStatus.UNDER_REVIEW;
      await this.driverProfileRepository.save(driver);
    }

    return vehicle;
  }

  async getDriverVehicles(userId: string) {
    const driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      return [];
    }

    return this.vehicleRepository.find({
      where: { driverId: driver.id },
      order: { createdAt: 'DESC' },
    });
  }

  async updateVehicle(userId: string, vehicleId: string, dto: UpdateVehicleDto) {
    const driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, driverId: driver.id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Update basic fields
    if (dto.type) vehicle.type = dto.type;
    if (dto.make) vehicle.make = dto.make;
    if (dto.model) vehicle.model = dto.model;
    if (dto.year) vehicle.year = dto.year;
    if (dto.color) vehicle.color = dto.color;
    if (dto.capacity) vehicle.capacity = dto.capacity;
    if (dto.capacityUnit) vehicle.capacityUnit = dto.capacityUnit;

    // Upload new photos if provided
    if (dto.photos && dto.photos.length > 0) {
      const photoUrls: string[] = [];
      for (const photoData of dto.photos) {
        const result = await this.s3UploadService.uploadVehiclePhoto(
          userId,
          vehicleId,
          photoData,
          'image/jpeg',
        );
        photoUrls.push(result.url);
      }
      vehicle.photos = photoUrls;
    }

    // Reset verification if substantial changes made
    vehicle.verified = false;
    vehicle.verifiedAt = null as any;
    vehicle.verifiedBy = null as any;

    await this.vehicleRepository.save(vehicle);
    return vehicle;
  }

  async deleteVehicle(userId: string, vehicleId: string) {
    const driver = await this.driverProfileRepository.findOne({ where: { userId } });

    if (!driver) {
      throw new NotFoundException('Driver profile not found');
    }

    const vehicle = await this.vehicleRepository.findOne({
      where: { id: vehicleId, driverId: driver.id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.vehicleRepository.remove(vehicle);
    return { message: 'Vehicle deleted successfully' };
  }

  // ============= Verification Status =============

  async getVerificationStatus(userId: string) {
    const driver = await this.driverProfileRepository.findOne({
      where: { userId },
      relations: ['documents', 'vehicles'],
    });

    if (!driver) {
      return {
        hasProfile: false,
        kycStatus: null,
        documentsCompleted: false,
        vehicleCompleted: false,
        requiredDocuments: Object.values(DocumentType),
        submittedDocuments: [],
        vehicles: [],
        canGoOnline: false,
        rejectionReason: null,
      };
    }

    const requiredDocTypes = [
      DocumentType.DRIVERS_LICENSE,
      DocumentType.NATIONAL_ID,
    ];

    const submittedDocTypes = driver.documents?.map(d => d.documentType) || [];
    const documentsCompleted = requiredDocTypes.every(dt => submittedDocTypes.includes(dt));
    const vehicleCompleted = driver.vehicles && driver.vehicles.length > 0;
    const canGoOnline = driver.kycStatus === DriverKycStatus.APPROVED;

    return {
      hasProfile: true,
      kycStatus: driver.kycStatus,
      verificationStatus: driver.verificationStatus,
      documentsCompleted,
      vehicleCompleted,
      requiredDocuments: requiredDocTypes,
      submittedDocuments: driver.documents || [],
      vehicles: driver.vehicles || [],
      canGoOnline,
      rejectionReason: driver.rejectionReason,
    };
  }
}
