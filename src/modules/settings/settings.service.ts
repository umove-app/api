import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Settings } from '../../entities/settings.entity';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(Settings)
    private settingsRepository: Repository<Settings>,
  ) {}

  async getSettings() {
    let settings = await this.settingsRepository.findOne({ where: {} });

    // If no settings exist, create default settings
    if (!settings) {
      settings = this.settingsRepository.create({
        vatPercentage: 7.5,
        minimumFare: 500,
        cancellationFeePercentage: 10,
        driverCommissionPercentage: 20,
        maxSearchRadius: 10,
        driverAcceptanceTimeout: 300,
        autoAssignDriver: true,
        supportEmail: 'support@umove.com',
        supportPhone: '+2348000000000',
        supportAddress: 'Lagos, Nigeria',
        companyName: 'UMove Logistics',
        companyAddress: 'Lagos, Nigeria',
      });
      await this.settingsRepository.save(settings);
    }

    return this.transformSettingsResponse(settings);
  }

  private transformSettingsResponse(settings: Settings) {
    return {
      id: settings.id,
      vatPercentage: settings.vatPercentage,
      minimumFare: settings.minimumFare,
      cancellationFeePercentage: settings.cancellationFeePercentage,
      driverCommissionPercentage: settings.driverCommissionPercentage,
      maxSearchRadiusKm: settings.maxSearchRadius,
      driverAcceptanceTimeoutMinutes: Math.round(settings.driverAcceptanceTimeout / 60),
      autoAssignDriver: settings.autoAssignDriver,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      supportAddress: settings.supportAddress,
      companyName: settings.companyName,
      companyAddress: settings.companyAddress,
      createdAt: settings.createdAt,
      updatedAt: settings.updatedAt,
    };
  }

  private transformSettingsInput(dto: UpdateSettingsDto): Partial<Settings> {
    const transformed: any = {};

    if (dto.vatPercentage !== undefined) transformed.vatPercentage = dto.vatPercentage;
    if (dto.minimumFare !== undefined) transformed.minimumFare = dto.minimumFare;
    if (dto.cancellationFeePercentage !== undefined) transformed.cancellationFeePercentage = dto.cancellationFeePercentage;
    if (dto.driverCommissionPercentage !== undefined) transformed.driverCommissionPercentage = dto.driverCommissionPercentage;
    if (dto.maxSearchRadiusKm !== undefined) transformed.maxSearchRadius = dto.maxSearchRadiusKm;
    if (dto.driverAcceptanceTimeoutMinutes !== undefined) transformed.driverAcceptanceTimeout = dto.driverAcceptanceTimeoutMinutes * 60;
    if (dto.autoAssignDriver !== undefined) transformed.autoAssignDriver = dto.autoAssignDriver;
    if (dto.supportEmail !== undefined) transformed.supportEmail = dto.supportEmail;
    if (dto.supportPhone !== undefined) transformed.supportPhone = dto.supportPhone;
    if (dto.supportAddress !== undefined) transformed.supportAddress = dto.supportAddress;
    if (dto.companyName !== undefined) transformed.companyName = dto.companyName;
    if (dto.companyAddress !== undefined) transformed.companyAddress = dto.companyAddress;

    return transformed;
  }

  async updateSettings(dto: UpdateSettingsDto) {
    let settings = await this.settingsRepository.findOne({ where: {} });
    const transformed = this.transformSettingsInput(dto);

    if (!settings) {
      settings = this.settingsRepository.create(transformed);
    } else {
      Object.assign(settings, transformed);
    }

    const saved = await this.settingsRepository.save(settings);
    return this.transformSettingsResponse(saved);
  }

  async getSetting(key: string) {
    const settings = await this.getSettings();
    return settings[key];
  }

  async getVatPercentage(): Promise<number> {
    const settings = await this.getSettings();
    return settings.vatPercentage;
  }

  async getMinimumFare(): Promise<number> {
    const settings = await this.getSettings();
    return settings.minimumFare;
  }

  async getDriverCommission(): Promise<number> {
    const settings = await this.getSettings();
    return settings.driverCommissionPercentage;
  }

  async getMaxSearchRadius(): Promise<number> {
    const settings = await this.getSettings();
    return settings.maxSearchRadiusKm;
  }

  async isAutoAssignEnabled(): Promise<boolean> {
    const settings = await this.getSettings();
    return settings.autoAssignDriver;
  }
}
