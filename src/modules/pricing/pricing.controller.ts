import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PricingService } from './pricing.service';
import { CalculateQuoteDto } from './dto/calculate-quote.dto';
import { QuoteResponseDto } from './dto/quote-response.dto';

@ApiTags('quotes')
@Controller('quotes')
@ApiBearerAuth()
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @ApiOperation({ summary: 'Calculate fare quote for a trip' })
  @ApiResponse({ status: 200, type: QuoteResponseDto })
  async calculateQuote(@Body() dto: CalculateQuoteDto): Promise<QuoteResponseDto> {
    return this.pricingService.calculateQuote(dto);
  }
}
