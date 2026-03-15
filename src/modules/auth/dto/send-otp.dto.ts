import { IsString, IsNotEmpty, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendOtpDto {
  @ApiProperty({
    description: 'Phone number to send OTP to',
    example: '+2348012345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Phone number must be a valid format',
  })
  phone: string;
}

export class SendOtpResponseDto {
  @ApiProperty({ description: 'Whether OTP was sent successfully' })
  success: boolean;

  @ApiProperty({ description: 'Message describing the result' })
  message: string;

  @ApiProperty({ description: 'PIN ID for verification (store this)', required: false })
  pinId?: string;

  @ApiProperty({ description: 'Expiry time in seconds' })
  expiresIn: number;
}
