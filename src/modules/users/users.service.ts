import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../../entities/user.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { DriverKycStatus, UserRole } from '../../common/enums';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

  async getProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: [
        'id',
        'name',
        'firstName',
        'lastName',
        'email',
        'phone',
        'phoneNumber',
        'role',
        'status',
        'country',
        'currency',
        'profilePicture',
        'defaultAddress',
        'defaultLatitude',
        'defaultLongitude',
        'emailVerified',
        'phoneVerified',
        'notificationPreferences',
        'createdAt',
      ],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const originalRole = user.role;
    let roleChanged = false;

    if (dto.email && dto.email.toLowerCase() !== user.email) {
      const existing = await this.userRepository.findOne({
        where: { email: dto.email.toLowerCase() },
      });
      if (existing && existing.id !== user.id) {
        throw new ConflictException('Email already in use');
      }
      user.email = dto.email.toLowerCase();
      user.emailVerified = false;
      user.isEmailVerified = false;
    }

    if (dto.firstName !== undefined || dto.lastName !== undefined) {
      const firstName = dto.firstName ?? user.firstName ?? '';
      const lastName = dto.lastName ?? user.lastName ?? '';
      user.firstName = firstName;
      user.lastName = lastName;

      if (!dto.name) {
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          user.name = fullName;
        }
      }
    }

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.role && dto.role !== user.role) {
      if (![UserRole.CUSTOMER, UserRole.DRIVER].includes(dto.role)) {
        throw new BadRequestException('Invalid role selection');
      }

      user.role = dto.role;
      roleChanged = true;

      if (dto.role === UserRole.DRIVER) {
        const existingProfile = await this.driverProfileRepository.findOne({
          where: { userId: user.id },
        });
        if (!existingProfile) {
          const profile = this.driverProfileRepository.create({
            userId: user.id,
            kycStatus: DriverKycStatus.PENDING,
          });
          await this.driverProfileRepository.save(profile);
        }
      }
    }

    if (dto.phone) {
      user.phone = dto.phone;
    }

    if (dto.defaultAddress !== undefined) {
      user.defaultAddress = dto.defaultAddress;
    }

    if (dto.defaultLatitude !== undefined) {
      user.defaultLatitude = dto.defaultLatitude;
    }

    if (dto.defaultLongitude !== undefined) {
      user.defaultLongitude = dto.defaultLongitude;
    }

    if (dto.profilePicture !== undefined) {
      user.profilePicture = dto.profilePicture;
    }

    if (dto.notificationPreferences !== undefined) {
      user.notificationPreferences = dto.notificationPreferences;
    }

    await this.userRepository.save(user);

    const profile = await this.getProfile(userId);

    // If role changed, generate new tokens with updated role
    if (roleChanged) {
      const payload = {
        sub: user.id,
        email: user.email,
        role: user.role,
      };

      const accessToken = this.jwtService.sign(payload);
      const refreshToken = this.jwtService.sign(payload, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d'),
      });

      return {
        ...profile,
        accessToken,
        refreshToken,
        roleChanged: true,
      };
    }

    return profile;
  }

  async updateFcmToken(userId: string, fcmToken: string) {
    await this.userRepository.update(userId, { fcmToken });
    return { message: 'FCM token updated successfully' };
  }
}
