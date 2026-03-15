import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PromosService } from './promos.service';
import { Promo } from '../../entities/promo.entity';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';
import { ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';

describe('PromosService', () => {
  let service: PromosService;
  let repository: Repository<Promo>;

  const mockPromo = {
    id: '123',
    code: 'SUMMER2024',
    description: 'Summer Sale',
    type: 'PERCENTAGE',
    value: 20,
    minOrderAmount: 5000,
    maxDiscount: 1000,
    maxUsage: 100,
    currentUsage: 45,
    maxUsagePerUser: 1,
    startDate: new Date('2024-01-01'),
    endDate: new Date('2024-12-31'),
    active: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    allowedCountries: [],
    allowedVehicleTypes: [],
    createdBy: null,
    metadata: null,
    isActive: true,
    currentUsageCount: 45,
    maxUsageCount: 100,
    expiresAt: new Date('2024-12-31'),
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PromosService,
        {
          provide: getRepositoryToken(Promo),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(),
            remove: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<PromosService>(PromosService);
    repository = module.get<Repository<Promo>>(getRepositoryToken(Promo));
  });

  describe('createPromo', () => {
    it('should create a promo with frontend payload format', async () => {
      const dto: CreatePromoDto = {
        code: 'SAVE20',
        description: 'Save 20%',
        discountType: 'PERCENTAGE' as any,
        discountValue: 20,
        maxUsageCount: 100,
        maxUsagePerUser: 1,
        minOrderValue: 5000,
        expiresAt: new Date('2024-12-31') as any,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(repository, 'create').mockReturnValueOnce(mockPromo);
      jest.spyOn(repository, 'save').mockResolvedValueOnce(mockPromo);

      const result = await service.createPromo(dto);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { code: 'SAVE20' },
      });
      expect(repository.create).toHaveBeenCalled();
      expect(repository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if code already exists', async () => {
      const dto: CreatePromoDto = {
        code: 'SUMMER2024',
        discountType: 'PERCENTAGE' as any,
        discountValue: 20,
        expiresAt: new Date('2024-12-31') as any,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(mockPromo);

      await expect(service.createPromo(dto)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if discount value is invalid', async () => {
      const dto: CreatePromoDto = {
        code: 'INVALID',
        discountType: 'PERCENTAGE' as any,
        discountValue: -10,
        expiresAt: new Date('2024-12-31') as any,
      };

      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.createPromo(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getAllPromos', () => {
    it('should return paginated promos with mapping', async () => {
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValueOnce([[mockPromo], 1]),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValueOnce(queryBuilder as any);

      const result = await service.getAllPromos(1, 20, true);

      expect(result.data).toBeDefined();
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
      expect(result.data[0].discountType).toBe('PERCENTAGE');
      expect(result.data[0].discountValue).toBe(20);
      expect(result.data[0].currentUsageCount).toBe(45);
    });

    it('should filter by isActive status', async () => {
      const queryBuilder = {
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValueOnce([[mockPromo], 1]),
      };

      jest.spyOn(repository, 'createQueryBuilder').mockReturnValueOnce(queryBuilder as any);

      await service.getAllPromos(1, 20, true);

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('promo.active = :isActive', { isActive: true });
    });
  });

  describe('getPromoById', () => {
    it('should return mapped promo by id', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(mockPromo);

      const result = await service.getPromoById('123');

      expect(result.code).toBe('SUMMER2024');
      expect(result.discountType).toBe('PERCENTAGE');
      expect(result.discountValue).toBe(20);
    });

    it('should throw NotFoundException if promo not found', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(null);

      await expect(service.getPromoById('999')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updatePromo', () => {
    it('should update promo with partial data', async () => {
      const updateDto: UpdatePromoDto = {
        discountValue: 25,
        maxUsageCount: 200,
      };

      const existingPromo = { ...mockPromo };
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(existingPromo);
      jest.spyOn(repository, 'save').mockResolvedValueOnce({ ...existingPromo, value: 25, maxUsage: 200 });

      await service.updatePromo('123', updateDto);

      expect(repository.save).toHaveBeenCalled();
    });
  });

  describe('getPromoStats', () => {
    it('should return correct stats format', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(mockPromo);

      const result = await service.getPromoStats('123');

      expect(result).toHaveProperty('totalUses');
      expect(result).toHaveProperty('maxUses');
      expect(result).toHaveProperty('remainingUses');
      expect(result).toHaveProperty('totalDiscountAmount');
      expect(result).toHaveProperty('uniqueUsers');
      expect(result).toHaveProperty('isExpired');
      expect(result).toHaveProperty('isMaxedOut');
      expect(result).toHaveProperty('canBeUsed');
      expect(result.totalUses).toBe(45);
      expect(result.maxUses).toBe(100);
      expect(result.remainingUses).toBe(55);
    });
  });

  describe('activatePromo', () => {
    it('should activate an inactive promo', async () => {
      const inactivePromo = { ...mockPromo, active: false };
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(inactivePromo);
      jest.spyOn(repository, 'save').mockResolvedValueOnce({ ...inactivePromo, active: true });

      const result = await service.activatePromo('123');

      expect(result.message).toBe('Promo activated successfully');
    });

    it('should throw BadRequestException if promo is expired', async () => {
      const expiredPromo = { ...mockPromo, endDate: new Date('2020-01-01') };
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(expiredPromo);

      await expect(service.activatePromo('123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePromo', () => {
    it('should delete unused promo', async () => {
      const unusedPromo = { ...mockPromo, currentUsage: 0 };
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(unusedPromo);
      jest.spyOn(repository, 'remove').mockResolvedValueOnce(unusedPromo);

      const result = await service.deletePromo('123');

      expect(result.message).toBe('Promo deleted successfully');
    });

    it('should throw BadRequestException if promo has been used', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(mockPromo);

      await expect(service.deletePromo('123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('mapPromoToFrontend', () => {
    it('should correctly map database format to frontend format', async () => {
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(mockPromo);

      const result = await service.getPromoById('123');

      expect(result).toEqual({
        id: mockPromo.id,
        code: mockPromo.code,
        description: mockPromo.description,
        discountType: 'PERCENTAGE',
        discountValue: mockPromo.value,
        minOrderValue: mockPromo.minOrderAmount,
        maxDiscount: mockPromo.maxDiscount,
        maxUsageCount: mockPromo.maxUsage,
        currentUsageCount: mockPromo.currentUsage,
        maxUsagePerUser: mockPromo.maxUsagePerUser,
        createdAt: mockPromo.createdAt,
        expiresAt: mockPromo.endDate,
        isActive: mockPromo.active,
        startDate: mockPromo.startDate,
      });
    });

    it('should map FIXED_AMOUNT discount type', async () => {
      const fixedAmountPromo = { ...mockPromo, type: 'FLAT' };
      jest.spyOn(repository, 'findOne').mockResolvedValueOnce(fixedAmountPromo);

      const result = await service.getPromoById('123');

      expect(result.discountType).toBe('FIXED_AMOUNT');
    });
  });
});
