import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VehicleType } from '../../entities/vehicle-type.entity';
import { Promo, PromoType } from '../../entities/promo.entity';
import { Settings } from '../../entities/settings.entity';
import { CalculateQuoteDto } from './dto/calculate-quote.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';

@Injectable()
export class PricingService {
  constructor(
    @InjectRepository(VehicleType)
    private vehicleTypeRepository: Repository<VehicleType>,
    @InjectRepository(Promo)
    private promoRepository: Repository<Promo>,
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {}

  async calculateQuote(dto: CalculateQuoteDto): Promise<QuoteResponseDto> {
    const { pickupLatitude, pickupLongitude, destinationLatitude, destinationLongitude, vehicleType, country, promoCode } = dto;

    // Get vehicle type
    const vehicle = await this.vehicleTypeRepository.findOne({
      where: { name: vehicleType, active: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle type '${vehicleType}' not found`);
    }

    // Calculate distance using Haversine formula
    const distance = this.calculateDistance(
      pickupLatitude,
      pickupLongitude,
      destinationLatitude,
      destinationLongitude,
    );

    // Get VAT rate
    const vatRate = await this.getVATRate(country);

    // Calculate base pricing
    const baseFare = vehicle.baseFare;
    const distanceFare = distance * vehicle.perKmRate;
    const subtotal = baseFare + distanceFare;

    // Apply minimum fare if exists
    let finalSubtotal = subtotal;
    if (vehicle.minimumFare && subtotal < vehicle.minimumFare) {
      finalSubtotal = vehicle.minimumFare;
    }

    // Calculate VAT
    const vat = finalSubtotal * vatRate;

    // Apply promo code if provided
    let discount = 0;
    let appliedPromoCode: string | null = null;

    if (promoCode) {
      const promo = await this.validateAndGetPromo(promoCode, country, vehicleType, finalSubtotal);
      if (promo) {
        discount = this.calculateDiscount(promo, finalSubtotal);
        appliedPromoCode = promoCode;
      }
    }

    // Calculate total
    const total = finalSubtotal + vat - discount;

    // Calculate estimated duration (assuming 40 km/h average speed)
    const estimatedDuration = Math.ceil((distance / 40) * 60); // in minutes

    return {
      subtotal: parseFloat(finalSubtotal.toFixed(2)),
      vat: parseFloat(vat.toFixed(2)),
      vatRate,
      discount: parseFloat(discount.toFixed(2)),
      promoCode: appliedPromoCode,
      total: parseFloat(total.toFixed(2)),
      currency: vehicle.currency,
      estimatedDistance: parseFloat(distance.toFixed(2)),
      distanceUnit: 'km',
      estimatedDuration,
      breakdown: {
        baseFare,
        distanceFare: parseFloat(distanceFare.toFixed(2)),
        totalBeforeVAT: parseFloat(finalSubtotal.toFixed(2)),
      },
    };
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private async getVATRate(country: string): Promise<number> {
    const settings = await this.settingsRepository.findOne({ where: {} });
    return settings ? settings.vatPercentage / 100 : 0.075; // Default 7.5%
  }

  private async validateAndGetPromo(
    code: string,
    country: string,
    vehicleType: string,
    orderAmount: number,
  ): Promise<Promo | null> {
    const promo = await this.promoRepository.findOne({
      where: { code, active: true },
    });

    if (!promo) {
      throw new BadRequestException('Invalid promo code');
    }

    const now = new Date();
    if (now < promo.startDate || now > promo.endDate) {
      throw new BadRequestException('Promo code has expired or not yet active');
    }

    if (promo.maxUsage && promo.currentUsage >= promo.maxUsage) {
      throw new BadRequestException('Promo code usage limit reached');
    }

    if (promo.minOrderAmount && orderAmount < promo.minOrderAmount) {
      throw new BadRequestException(
        `Minimum order amount of ${promo.minOrderAmount} required for this promo`,
      );
    }

    if (promo.allowedCountries.length > 0 && !promo.allowedCountries.includes(country)) {
      throw new BadRequestException('Promo code not valid for this country');
    }

    if (promo.allowedVehicleTypes.length > 0 && !promo.allowedVehicleTypes.includes(vehicleType)) {
      throw new BadRequestException('Promo code not valid for this vehicle type');
    }

    return promo;
  }

  private calculateDiscount(promo: Promo, amount: number): number {
    let discount = 0;

    if (promo.type === PromoType.PERCENTAGE) {
      discount = (amount * promo.value) / 100;
      if (promo.maxDiscount && discount > promo.maxDiscount) {
        discount = promo.maxDiscount;
      }
    } else {
      discount = promo.value;
    }

    return discount;
  }
}
