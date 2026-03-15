import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { SendOtpDto, SendOtpResponseDto } from './dto/send-otp.dto';
import { VerifyOtpDto, VerifyOtpResponseDto } from './dto/verify-otp.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ==================== Customer OTP Authentication ====================

  @Public()
  @Post('customer/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to customer phone number for authentication' })
  @ApiResponse({ status: 200, type: SendOtpResponseDto })
  async sendCustomerOtp(@Body() sendOtpDto: SendOtpDto): Promise<SendOtpResponseDto> {
    return this.authService.sendOtp(sendOtpDto.phone);
  }

  @Public()
  @Post('customer/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and authenticate customer' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifyCustomerOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtpAndLogin(
      verifyOtpDto.phone,
      verifyOtpDto.pinId,
      verifyOtpDto.otp,
      UserRole.CUSTOMER,
    );
  }

  // ==================== Driver OTP Authentication ====================

  @Public()
  @Post('driver/send-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to driver phone number for authentication' })
  @ApiResponse({ status: 200, type: SendOtpResponseDto })
  async sendDriverOtp(@Body() sendOtpDto: SendOtpDto): Promise<SendOtpResponseDto> {
    return this.authService.sendOtp(sendOtpDto.phone);
  }

  @Public()
  @Post('driver/verify-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify OTP and authenticate driver' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async verifyDriverOtp(@Body() verifyOtpDto: VerifyOtpDto): Promise<AuthResponseDto> {
    return this.authService.verifyOtpAndLogin(
      verifyOtpDto.phone,
      verifyOtpDto.pinId,
      verifyOtpDto.otp,
      UserRole.DRIVER,
    );
  }

  // ==================== Email/Password Registration ====================

  @Public()
  @Post('customer/register')
  @ApiOperation({ summary: 'Register a new customer' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async registerCustomer(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    registerDto.role = UserRole.CUSTOMER;
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('driver/register')
  @ApiOperation({ summary: 'Register a new driver' })
  @ApiResponse({ status: 201, type: AuthResponseDto })
  async registerDriver(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    registerDto.role = UserRole.DRIVER;
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('customer/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Customer login' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginCustomer(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('driver/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Driver login' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginDriver(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Admin login' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async loginAdmin(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Get('google')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth login' })
  async googleAuth() {
    // Initiates Google OAuth flow
  }

  @Public()
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  @ApiOperation({ summary: 'Google OAuth callback' })
  async googleAuthCallback(@Req() req): Promise<AuthResponseDto> {
    return this.authService.googleAuth(req.user);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, type: AuthResponseDto })
  async refresh(@Body() refreshTokenDto: RefreshTokenDto): Promise<AuthResponseDto> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Logout user' })
  @ApiResponse({ status: 204 })
  async logout(@CurrentUser() user, @Req() req): Promise<void> {
    const token = req.headers.authorization?.replace('Bearer ', '');
    await this.authService.logout(user.id, token);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  getCurrentUser(@CurrentUser() user) {
    return user;
  }
}
