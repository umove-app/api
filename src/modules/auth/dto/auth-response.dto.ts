import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthResponseDto {
  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  accessToken: string;

  @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' })
  refreshToken: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType: string;

  @ApiProperty({ example: 604800 })
  expiresIn: number;

  @ApiPropertyOptional({ example: true })
  isNewUser?: boolean;

  @ApiProperty({
    example: {
      id: 'uuid',
      email: 'john@example.com',
      name: 'John Doe',
      role: 'CUSTOMER',
    },
  })
  user: {
    id: string;
    email: string;
    name: string;
    role: string;
    adminRole?: string;
  };
}
