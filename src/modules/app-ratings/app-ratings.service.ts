import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AppRating } from '../../entities/app-rating.entity';
import { CreateAppRatingDto } from './dto';

@Injectable()
export class AppRatingsService {
  private readonly logger = new Logger(AppRatingsService.name);

  constructor(
    @InjectRepository(AppRating)
    private readonly appRatingRepository: Repository<AppRating>,
  ) {}

  async createRating(
    userId: string,
    createAppRatingDto: CreateAppRatingDto,
  ): Promise<AppRating> {
    this.logger.log(`Creating app rating for user: ${userId}`);

    const rating = this.appRatingRepository.create({
      userId,
      ...createAppRatingDto,
    });

    return await this.appRatingRepository.save(rating);
  }

  async getUserRatings(userId: string): Promise<AppRating[]> {
    return await this.appRatingRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getLatestUserRating(userId: string): Promise<AppRating | null> {
    return await this.appRatingRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getAverageRating(): Promise<{
    averageRating: number;
    totalRatings: number;
  }> {
    const result = await this.appRatingRepository
      .createQueryBuilder('rating')
      .select('AVG(rating.rating)', 'averageRating')
      .addSelect('COUNT(rating.id)', 'totalRatings')
      .getRawOne();

    return {
      averageRating: parseFloat(result.averageRating || '0'),
      totalRatings: parseInt(result.totalRatings || '0'),
    };
  }

  async getAllRatings(limit = 100): Promise<AppRating[]> {
    return await this.appRatingRepository.find({
      take: limit,
      order: { createdAt: 'DESC' },
      relations: ['user'],
    });
  }
}
