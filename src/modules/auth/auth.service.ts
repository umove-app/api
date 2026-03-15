import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { DriverProfile } from '../../entities/driver-profile.entity';
import { AdminProfile } from '../../entities/admin-profile.entity';
import { HashUtil } from '../../common/utils/hash.util';
import { RedisService } from '../../config/redis.service';
import { SmsService } from '../../common/services/sms.service';
import { UserRole, UserStatus, DriverKycStatus, AdminRole } from '../../common/enums';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SendOtpResponseDto } from './dto/send-otp.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(DriverProfile)
    private driverProfileRepository: Repository<DriverProfile>,
    @InjectRepository(AdminProfile)
    private adminProfileRepository: Repository<AdminProfile>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private redisService: RedisService,
    private smsService: SmsService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, role, name, phone, country } = registerDto;

    const existingUser = await this.userRepository.findOne({ where: { email } });
    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    if (role === UserRole.ADMIN) {
      throw new BadRequestException('Cannot register as admin through this endpoint');
    }

    const hashedPassword = await HashUtil.hash(password);

    const user = this.userRepository.create({
      name,
      email,
      phone,
      password: hashedPassword,
      role,
      status: UserStatus.ACTIVE,
      country: country || 'Nigeria',
      currency: country === 'Nigeria' || !country ? 'NGN' : 'USD',
    });

    await this.userRepository.save(user);

    if (role === UserRole.DRIVER) {
      const driverProfile = this.driverProfileRepository.create({
        userId: user.id,
        kycStatus: DriverKycStatus.PENDING,
      });
      await this.driverProfileRepository.save(driverProfile);
    }

    return this.generateAuthResponse(user, { isNewUser: true });
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await HashUtil.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException('Account is not active');
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return this.generateAuthResponse(user);
  }

  async googleAuth(googleUser: any): Promise<AuthResponseDto> {
    const { email, name, googleId, profilePicture } = googleUser;

    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      user = this.userRepository.create({
        name,
        email,
        googleId,
        profilePicture,
        role: UserRole.CUSTOMER,
        status: UserStatus.ACTIVE,
        emailVerified: true,
        country: 'Nigeria',
        currency: 'NGN',
      });
      await this.userRepository.save(user);
    } else {
      if (!user.googleId) {
        await this.userRepository.update(user.id, {
          googleId,
          emailVerified: true,
          profilePicture: profilePicture || user.profilePicture,
        });
      }
    }

    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return this.generateAuthResponse(user);
  }

  async refreshToken(refreshToken: string): Promise<AuthResponseDto> {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({ where: { id: payload.sub } });

      if (!user) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const isBlacklisted = await this.redisService.exists(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }

      return this.generateAuthResponse(user);
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(userId: string, token: string): Promise<void> {
    const expiresIn = this.configService.get<string>('JWT_REFRESH_EXPIRES_IN', '30d');
    const ttl = this.parseDuration(expiresIn);

    await this.redisService.set(`blacklist:${token}`, userId, ttl);
  }

  // ==================== OTP Authentication (Termii) ====================

  async sendOtp(phone: string): Promise<SendOtpResponseDto> {
    const result = await this.smsService.sendOtp(phone);

    if (!result.success) {
      throw new BadRequestException(result.message);
    }

    if (!result.pinId) {
      throw new BadRequestException('Failed to generate OTP session');
    }

    return {
      success: true,
      message: 'OTP sent successfully',
      pinId: result.pinId,
      expiresIn: 600, // 10 minutes
    };
  }

  async verifyOtpAndLogin(
    phone: string,
    pinId: string,
    otp: string,
    role: UserRole,
  ): Promise<AuthResponseDto> {
    // Verify OTP with Termii
    const verifyResult = await this.smsService.verifyOtp(pinId, otp);

    if (!verifyResult.success) {
      throw new BadRequestException(verifyResult.message);
    }

    if (!verifyResult.verified) {
      throw new UnauthorizedException('Invalid or expired OTP');
    }

    // Format phone number for lookup
    const formattedPhone = this.formatPhoneNumber(phone);

    // Find or create user by phone number
    let isNewUser = false;
    let user = await this.userRepository.findOne({
      where: { phone: formattedPhone },
    });

    if (!user) {
      isNewUser = true;
      const sanitizedPhone = formattedPhone.replace(/[^0-9]/g, '');
      const last4 = sanitizedPhone.slice(-4);
      const defaultFirstName = 'UMove';
      const defaultLastName = last4 ? `User ${last4}` : 'User';
      const defaultName = `${defaultFirstName} ${defaultLastName}`;
      const defaultEmail = `phone_${sanitizedPhone || Date.now()}@umove.local`;

      // Create new user with phone number
      user = this.userRepository.create({
        name: defaultName,
        firstName: defaultFirstName,
        lastName: defaultLastName,
        email: defaultEmail,
        phone: formattedPhone,
        phoneNumber: formattedPhone,
        role,
        status: UserStatus.ACTIVE,
        phoneVerified: true,
        country: 'Nigeria',
        currency: 'NGN',
      });
      await this.userRepository.save(user);

      // If driver, create driver profile
      if (role === UserRole.DRIVER) {
        const driverProfile = this.driverProfileRepository.create({
          userId: user.id,
          kycStatus: DriverKycStatus.PENDING,
        });
        await this.driverProfileRepository.save(driverProfile);
      }
    } else {
      // Verify user role matches
      if (user.role !== role) {
        throw new UnauthorizedException(
          `This phone number is registered as a ${user.role}. Please use the correct app.`,
        );
      }

      // Check if user is active
      if (user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException('Account is not active');
      }

      // Update phone verified status
      if (!user.phoneVerified) {
        await this.userRepository.update(user.id, { phoneVerified: true });
      }
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return this.generateAuthResponse(user, { isNewUser });
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // If starts with 0, replace with Nigeria country code
    if (cleaned.startsWith('0')) {
      cleaned = '+234' + cleaned.substring(1);
    }

    // If doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  private async generateAuthResponse(
    user: User,
    options?: { isNewUser?: boolean },
  ): Promise<AuthResponseDto> {
    let adminRole: AdminRole | null = null;

    if (user.role === UserRole.ADMIN) {
      const adminProfile = await this.adminProfileRepository.findOne({
        where: { userId: user.id },
      });
      adminRole = adminProfile?.adminRole || AdminRole.ADMIN;
    }

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

    const expiresIn = this.parseDuration(
      this.configService.get<string>('JWT_EXPIRES_IN', '7d'),
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn,
      ...(options?.isNewUser !== undefined ? { isNewUser: options.isNewUser } : {}),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        ...(adminRole ? { adminRole } : {}),
      },
    };
  }

  private parseDuration(duration: string): number {
    const units: Record<string, number> = {
      s: 1,
      m: 60,
      h: 3600,
      d: 86400,
    };

    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) return 604800;

    const [, value, unit] = match;
    return parseInt(value) * units[unit];
  }
}
