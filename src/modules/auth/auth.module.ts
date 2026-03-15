import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SmsService } from '../../common/services/sms.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, DriverProfile, AdminProfile]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get<string>('JWT_EXPIRES_IN', '7d'),
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SmsService, JwtStrategy, GoogleStrategy],
  exports: [AuthService, SmsService, JwtStrategy, PassportModule, JwtModule],
})
export class AuthModule {}
