import { IsString, IsNotEmpty, Length, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VerifyOtpDto {
  @ApiProperty({
    description: 'Phone number that received the OTP',
    example: '+2348012345678',
  })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\+?[0-9]{10,15}$/, {
    message: 'Phone number must be a valid format',
  })
  phone: string;

  @ApiProperty({
    description: 'PIN ID received from send-otp endpoint',
    example: 'abc123-pin-id',
  })
  @IsString()
  @IsNotEmpty()
  pinId: string;

  @ApiProperty({
    description: '6-digit OTP code',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6, { message: 'OTP must be exactly 6 digits' })
  @Matches(/^[0-9]{6}$/, { message: 'OTP must contain only digits' })
  otp: string;
}

export class VerifyOtpResponseDto {
  @ApiProperty({ description: 'Whether verification was successful' })
  success: boolean;

  @ApiProperty({ description: 'Whether OTP is valid' })
  verified: boolean;

  @ApiProperty({ description: 'Message describing the result' })
  message: string;
}
