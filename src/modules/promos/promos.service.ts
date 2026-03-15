import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Promo, PromoType } from '../../entities/promo.entity';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { DiscountType } from '../../common/enums';

@Injectable()
export class PromosService {
  constructor(
    @InjectRepository(Promo)
    private promoRepository: Repository<Promo>,
  ) {}

  private mapDiscountTypeToPromoType(discountType: DiscountType): PromoType {
    if (discountType === DiscountType.PERCENTAGE) {
      return PromoType.PERCENTAGE;
    }
    return PromoType.FLAT; // FIXED maps to FLAT
  }

  async createPromo(dto: CreatePromoDto) {
    // Check if promo code already exists
    const existingPromo = await this.promoRepository.findOne({
      where: { code: dto.code.toUpperCase() },
    });

    if (existingPromo) {
      throw new ConflictException('Promo code already exists');
    }

    // Validate discount value
    if (dto.discountValue <= 0) {
      throw new BadRequestException('Discount value must be greater than 0');
    }

    // Set default start date if not provided
    const startDate = dto.startDate ? new Date(dto.startDate) : new Date();
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    // Validate expiry date
    if (expiresAt <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future');
    }

    const promo = this.promoRepository.create({
      code: dto.code.toUpperCase(),
      description: dto.description,
      type: this.mapDiscountTypeToPromoType(dto.discountType),
      value: dto.discountValue,
      minOrderAmount: dto.minOrderValue,
      maxDiscount: dto.maxDiscount,
      maxUsage: dto.maxUsageCount,
      maxUsagePerUser: dto.maxUsagePerUser ?? 1,
      startDate,
      endDate: expiresAt,
      active: dto.isActive ?? true,
      currentUsage: 0,
    });

    return this.promoRepository.save(promo);
  }

  async getAllPromos(page: number = 1, limit: number = 20, isActive?: boolean) {
    const query = this.promoRepository.createQueryBuilder('promo');

    if (isActive !== undefined) {
      query.andWhere('promo.active = :isActive', { isActive });
    }

    query
      .orderBy('promo.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [promos, total] = await query.getManyAndCount();

    // Map database fields to frontend expected fields
    const mappedPromos = promos.map(this.mapPromoToFrontend);

    return {
      data: mappedPromos,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getPromoById(id: string) {
    const promo = await this.promoRepository.findOne({ where: { id } });

    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    return this.mapPromoToFrontend(promo);
  }

  async getPromoByCode(code: string) {
    const promo = await this.promoRepository.findOne({
      where: { code: code.toUpperCase() },
    });

    if (!promo) {
      throw new NotFoundException('Promo code not found');
    }

    return this.mapPromoToFrontend(promo);
  }

  async updatePromo(id: string, dto: UpdatePromoDto) {
    const promo = await this.promoRepository.findOne({ where: { id } });

    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    // Validate discount value if provided
    if (dto.discountValue !== undefined && dto.discountValue <= 0) {
      throw new BadRequestException('Discount value must be greater than 0');
    }

    // Validate expiry date if provided
    if (dto.expiresAt && new Date(dto.expiresAt) <= new Date()) {
      throw new BadRequestException('Expiry date must be in the future');
    }

    // Map DTO fields to entity fields
    if (dto.discountType !== undefined) {
      promo.type = this.mapDiscountTypeToPromoType(dto.discountType);
    }
    if (dto.discountValue !== undefined) {
      promo.value = dto.discountValue;
    }
    if (dto.description !== undefined) {
      promo.description = dto.description;
    }
    if (dto.minOrderValue !== undefined) {
      promo.minOrderAmount = dto.minOrderValue;
    }
    if (dto.maxDiscount !== undefined) {
      promo.maxDiscount = dto.maxDiscount;
    }
    if (dto.maxUsageCount !== undefined) {
      promo.maxUsage = dto.maxUsageCount;
    }
    if (dto.maxUsagePerUser !== undefined) {
      promo.maxUsagePerUser = dto.maxUsagePerUser;
    }
    if (dto.startDate !== undefined) {
      promo.startDate = new Date(dto.startDate);
    }
    if (dto.expiresAt !== undefined) {
      promo.endDate = new Date(dto.expiresAt);
    }
    if (dto.isActive !== undefined) {
      promo.active = dto.isActive;
    }

    const updated = await this.promoRepository.save(promo);
    return this.mapPromoToFrontend(updated);
  }

  async deactivatePromo(id: string) {
    const promo = await this.promoRepository.findOne({ where: { id } });

    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    promo.active = false;

    await this.promoRepository.save(promo);

    return { message: 'Promo deactivated successfully' };
  }

  async activatePromo(id: string) {
    const promo = await this.promoRepository.findOne({ where: { id } });

    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    // Check if promo is expired
    if (new Date(promo.endDate) <= new Date()) {
      throw new BadRequestException('Cannot activate expired promo. Update expiry date first.');
    }

    promo.active = true;

    await this.promoRepository.save(promo);

    return { message: 'Promo activated successfully' };
  }

  async deletePromo(id: string) {
    const promo = await this.promoRepository.findOne({ where: { id } });

    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    // Check if promo has been used
    if (promo.currentUsage > 0) {
      throw new BadRequestException('Cannot delete promo that has been used. Deactivate it instead.');
    }

    await this.promoRepository.remove(promo);

    return { message: 'Promo deleted successfully' };
  }

  async getPromoStats(id: string) {
    const promo = await this.promoRepository.findOne({ where: { id } });

    if (!promo) {
      throw new NotFoundException('Promo not found');
    }

    const remainingUsage = promo.maxUsage
      ? promo.maxUsage - promo.currentUsage
      : null;

    const isExpired = new Date(promo.endDate) <= new Date();
    const isMaxedOut = promo.maxUsage ? promo.currentUsage >= promo.maxUsage : false;

    return {
      totalUses: promo.currentUsage,
      maxUses: promo.maxUsage,
      remainingUses: remainingUsage,
      totalDiscountAmount: 0, // Would need to calculate from orders
      uniqueUsers: 0, // Would need to calculate from orders
      isExpired,
      isMaxedOut,
      canBeUsed: promo.active && !isExpired && !isMaxedOut,
      usagesByDate: [], // Would need to calculate from orders
    };
  }

  private mapPromoToFrontend(promo: Promo): any {
    return {
      id: promo.id,
      code: promo.code,
      description: promo.description,
      discountType: promo.type === 'PERCENTAGE' ? 'PERCENTAGE' : 'FIXED_AMOUNT',
      discountValue: promo.value,
      minOrderValue: promo.minOrderAmount,
      maxDiscount: promo.maxDiscount,
      maxUsageCount: promo.maxUsage,
      currentUsageCount: promo.currentUsage,
      maxUsagePerUser: promo.maxUsagePerUser,
      createdAt: promo.createdAt,
      expiresAt: promo.endDate,
      isActive: promo.active,
      startDate: promo.startDate,
    };
  }
}
