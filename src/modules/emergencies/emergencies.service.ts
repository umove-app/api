import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Emergency, EmergencyStatus, EmergencyType } from '../../entities/emergency.entity';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { UpdateEmergencyDto } from './dto/update-emergency.dto';

@Injectable()
export class EmergenciesService {
    private readonly logger = new Logger(EmergenciesService.name);

    constructor(
        @InjectRepository(Emergency)
        private emergencyRepository: Repository<Emergency>,
    ) { }

    async create(userId: string, userRole: string, dto: CreateEmergencyDto): Promise<Emergency> {
        this.logger.log(`Creating emergency for user: ${userId}, type: ${dto.type}`);

        const emergency = this.emergencyRepository.create({
            userId,
            userRole,
            type: dto.type,
            description: dto.description,
            latitude: dto.latitude,
            longitude: dto.longitude,
            address: dto.address,
            orderId: dto.orderId,
            platform: dto.platform,
            metadata: dto.metadata,
            status: EmergencyStatus.REPORTED,
        });

        const saved = await this.emergencyRepository.save(emergency);
        this.logger.log(`Emergency created: ${saved.id}`);

        // TODO: Send push notification to admins
        // TODO: Send SMS alert if critical

        return saved;
    }

    async findAll(
        page: number = 1,
        limit: number = 20,
        status?: EmergencyStatus,
        type?: EmergencyType,
    ) {
        // Ensure page and limit are valid positive numbers
        const validPage = Math.max(1, page || 1);
        const validLimit = Math.max(1, Math.min(100, limit || 20));
        const skip = (validPage - 1) * validLimit;

        const whereClause: any = {};
        if (status) whereClause.status = status;
        if (type) whereClause.type = type;

        const [emergencies, total] = await this.emergencyRepository.findAndCount({
            where: whereClause,
            relations: ['user', 'handledByAdmin'],
            order: { createdAt: 'DESC' },
            skip,
            take: limit,
        });

        return {
            data: emergencies.map(e => ({
                ...e,
                user: e.user ? {
                    id: e.user.id,
                    name: `${e.user.firstName} ${e.user.lastName}`,
                    phone: e.user.phoneNumber || e.user.phone,
                    email: e.user.email,
                } : null,
                handledByAdmin: e.handledByAdmin ? {
                    id: e.handledByAdmin.id,
                    name: `${e.handledByAdmin.firstName} ${e.handledByAdmin.lastName}`,
                } : null,
            })),
            meta: {
                page: validPage,
                limit: validLimit,
                total,
                totalPages: Math.max(1, Math.ceil(total / validLimit)),
            },
        };
    }

    async findRecent(limit: number = 10) {
        const emergencies = await this.emergencyRepository.find({
            where: {
                status: In([EmergencyStatus.REPORTED, EmergencyStatus.ACKNOWLEDGED, EmergencyStatus.RESPONDING]),
            },
            relations: ['user'],
            order: { createdAt: 'DESC' },
            take: limit,
        });

        return emergencies.map(e => ({
            id: e.id,
            type: e.type,
            status: e.status,
            latitude: e.latitude,
            longitude: e.longitude,
            address: e.address,
            description: e.description,
            userRole: e.userRole,
            createdAt: e.createdAt,
            user: e.user ? {
                id: e.user.id,
                name: `${e.user.firstName} ${e.user.lastName}`,
                phone: e.user.phoneNumber || e.user.phone,
            } : null,
        }));
    }

    async findOne(id: string): Promise<Emergency> {
        const emergency = await this.emergencyRepository.findOne({
            where: { id },
            relations: ['user', 'handledByAdmin'],
        });

        if (!emergency) {
            throw new NotFoundException('Emergency not found');
        }

        return emergency;
    }

    async findByUser(userId: string) {
        return this.emergencyRepository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
            take: 20,
        });
    }

    async update(id: string, adminId: string, dto: UpdateEmergencyDto): Promise<Emergency> {
        const emergency = await this.findOne(id);

        if (dto.status) {
            emergency.status = dto.status;

            if (dto.status === EmergencyStatus.ACKNOWLEDGED && !emergency.acknowledgedAt) {
                emergency.acknowledgedAt = new Date();
                emergency.handledByAdminId = adminId;
            }

            if (dto.status === EmergencyStatus.RESOLVED || dto.status === EmergencyStatus.FALSE_ALARM) {
                emergency.resolvedAt = new Date();
            }
        }

        if (dto.adminNotes) {
            emergency.adminNotes = dto.adminNotes;
        }

        return this.emergencyRepository.save(emergency);
    }

    async getStats() {
        const [reported, acknowledged, responding, resolved, falseAlarm] = await Promise.all([
            this.emergencyRepository.count({ where: { status: EmergencyStatus.REPORTED } }),
            this.emergencyRepository.count({ where: { status: EmergencyStatus.ACKNOWLEDGED } }),
            this.emergencyRepository.count({ where: { status: EmergencyStatus.RESPONDING } }),
            this.emergencyRepository.count({ where: { status: EmergencyStatus.RESOLVED } }),
            this.emergencyRepository.count({ where: { status: EmergencyStatus.FALSE_ALARM } }),
        ]);

        return {
            reported,
            acknowledged,
            responding,
            resolved,
            falseAlarm,
            active: reported + acknowledged + responding,
            total: reported + acknowledged + responding + resolved + falseAlarm,
        };
    }
}
