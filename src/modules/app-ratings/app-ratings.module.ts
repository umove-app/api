import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppRating } from '../../entities/app-rating.entity';
import { AppRatingsController } from './app-ratings.controller';
import { AppRatingsService } from './app-ratings.service';

@Module({
  imports: [TypeOrmModule.forFeature([AppRating])],
  controllers: [AppRatingsController],
  providers: [AppRatingsService],
  exports: [AppRatingsService],
})
export class AppRatingsModule {}
