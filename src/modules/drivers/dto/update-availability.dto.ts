import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';
import { DriverAvailabilityStatus } from '../../../common/enums';

export class UpdateAvailabilityDto {
  @ApiProperty({ enum: DriverAvailabilityStatus, example: DriverAvailabilityStatus.ONLINE })
  @IsEnum(DriverAvailabilityStatus)
  @IsNotEmpty()
  status: DriverAvailabilityStatus;
}
