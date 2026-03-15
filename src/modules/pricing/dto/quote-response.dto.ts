import { ApiProperty } from '@nestjs/swagger';

export class QuoteResponseDto {
  @ApiProperty({ example: 5000 })
  subtotal: number;

  @ApiProperty({ example: 375 })
  vat: number;

  @ApiProperty({ example: 0.075 })
  vatRate: number;

  @ApiProperty({ example: 500 })
  discount: number;

  @ApiProperty({ example: 'SAVE10' })
  promoCode: string | null;

  @ApiProperty({ example: 4875 })
  total: number;

  @ApiProperty({ example: 'NGN' })
  currency: string;

  @ApiProperty({ example: 12.5 })
  estimatedDistance: number;

  @ApiProperty({ example: 'km' })
  distanceUnit: string;

  @ApiProperty({ example: 25 })
  estimatedDuration: number;

  @ApiProperty({
    example: {
      baseFare: 1000,
      distanceFare: 4000,
      totalBeforeVAT: 5000,
    },
  })
  breakdown: {
    baseFare: number;
    distanceFare: number;
    totalBeforeVAT: number;
  };
}
