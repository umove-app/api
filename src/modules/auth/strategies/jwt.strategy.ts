import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../../entities/user.entity';
import { AdminProfile } from '../../../entities/admin-profile.entity';
import { AdminRole } from '../../../common/enums/user-role.enum';

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(AdminProfile)
    private adminProfileRepository: Repository<AdminProfile>,
    configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload) {
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is not active');
    }

    let adminRole: AdminRole | null = null;
    if (user.role === 'ADMIN') {
      const adminProfile = await this.adminProfileRepository.findOne({
        where: { userId: user.id },
      });
      adminRole = adminProfile?.adminRole || null;
    }

    return {
      id: user.id,
      email: user.email,
      role: user.role,
      adminRole,
    };
  }
}
