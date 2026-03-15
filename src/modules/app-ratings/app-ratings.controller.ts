import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AppRatingsService } from './app-ratings.service';
import { CreateAppRatingDto } from './dto';

@Controller('app-ratings')
export class AppRatingsController {
  constructor(private readonly appRatingsService: AppRatingsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async createRating(@Request() req, @Body() createAppRatingDto: CreateAppRatingDto) {
    const rating = await this.appRatingsService.createRating(
      req.user.id,
      createAppRatingDto,
    );

    return {
      success: true,
      message: 'Thank you for rating our app!',
      data: rating,
    };
  }

  @Get('my-ratings')
  @UseGuards(JwtAuthGuard)
  async getMyRatings(@Request() req) {
    const ratings = await this.appRatingsService.getUserRatings(req.user.id);
    return {
      success: true,
      data: ratings,
    };
  }

  @Get('average')
  async getAverageRating() {
    const stats = await this.appRatingsService.getAverageRating();
    return {
      success: true,
      data: stats,
    };
  }
}
