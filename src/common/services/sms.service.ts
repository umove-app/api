/**
 * UMove API - SMS Service using Termii
 * Handles OTP sending and verification via Termii SMS gateway
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface SendOtpResponse {
  success: boolean;
  pinId?: string;
  message: string;
}

export interface VerifyOtpResponse {
  success: boolean;
  verified: boolean;
  message: string;
}

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly baseUrl = 'https://api.ng.termii.com/api';
  private readonly apiKey: string;
  private readonly senderId: string;
  private readonly httpClient: AxiosInstance;

  constructor(private readonly configService: ConfigService) {
    this.apiKey = this.configService.get<string>('TERMII_API_KEY', '');
    this.senderId = this.configService.get<string>('TERMII_SENDER_ID', 'UMove');

    this.httpClient = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Send OTP to a phone number using Termii
   */
  async sendOtp(phoneNumber: string): Promise<SendOtpResponse> {
    if (!this.apiKey) {
      this.logger.warn('Termii API key not configured, using mock OTP');
      return {
        success: true,
        pinId: 'mock_pin_id_' + Date.now(),
        message: 'Mock OTP sent (Termii not configured)',
      };
    }

    try {
      const payload = {
        api_key: this.apiKey,
        message_type: 'NUMERIC',
        to: this.formatPhoneNumber(phoneNumber),
        from: this.senderId,
        channel: 'generic',
        pin_attempts: 3,
        pin_time_to_live: 10, // 10 minutes
        pin_length: 6,
        pin_placeholder: '< 1234 >',
        message_text: 'Your UMove verification code is < 1234 >. Valid for 10 minutes. Do not share this code.',
        pin_type: 'NUMERIC',
      };

      const response = await this.httpClient.post('/sms/otp/send', payload);

      if (response.data.pinId) {
        this.logger.log(`OTP sent successfully to ${this.maskPhoneNumber(phoneNumber)}`);
        return {
          success: true,
          pinId: response.data.pinId,
          message: 'OTP sent successfully',
        };
      }

      this.logger.error(`Failed to send OTP: ${JSON.stringify(response.data)}`);
      return {
        success: false,
        message: response.data.message || 'Failed to send OTP',
      };
    } catch (error) {
      this.logger.error(`Termii API error: ${error.message}`);
      return {
        success: false,
        message: 'Failed to send OTP. Please try again.',
      };
    }
  }

  /**
   * Verify OTP using Termii
   */
  async verifyOtp(pinId: string, otp: string): Promise<VerifyOtpResponse> {
    // Handle mock verification for development
    if (pinId.startsWith('mock_pin_id_')) {
      // In development, accept '123456' as valid OTP
      const isValid = otp === '123456';
      return {
        success: true,
        verified: isValid,
        message: isValid ? 'OTP verified successfully' : 'Invalid OTP',
      };
    }

    if (!this.apiKey) {
      this.logger.warn('Termii API key not configured');
      return {
        success: false,
        verified: false,
        message: 'SMS service not configured',
      };
    }

    try {
      const payload = {
        api_key: this.apiKey,
        pin_id: pinId,
        pin: otp,
      };

      const response = await this.httpClient.post('/sms/otp/verify', payload);

      const verified = response.data.verified === true || response.data.verified === 'True';

      this.logger.log(`OTP verification result: ${verified}`);
      return {
        success: true,
        verified,
        message: verified ? 'OTP verified successfully' : 'Invalid or expired OTP',
      };
    } catch (error) {
      this.logger.error(`Termii verify error: ${error.message}`);

      // Check if it's an invalid OTP error from Termii
      if (error.response?.data?.verified === false) {
        return {
          success: true,
          verified: false,
          message: 'Invalid or expired OTP',
        };
      }

      return {
        success: false,
        verified: false,
        message: 'Failed to verify OTP. Please try again.',
      };
    }
  }

  /**
   * Send a regular SMS (non-OTP)
   */
  async sendSms(phoneNumber: string, message: string): Promise<boolean> {
    if (!this.apiKey) {
      this.logger.warn('Termii API key not configured, SMS not sent');
      return false;
    }

    try {
      const payload = {
        api_key: this.apiKey,
        to: this.formatPhoneNumber(phoneNumber),
        from: this.senderId,
        sms: message,
        type: 'plain',
        channel: 'generic',
      };

      const response = await this.httpClient.post('/sms/send', payload);

      return response.data.code === 'ok';
    } catch (error) {
      this.logger.error(`Failed to send SMS: ${error.message}`);
      return false;
    }
  }

  /**
   * Format phone number to international format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove any spaces, dashes, or parentheses
    let cleaned = phone.replace(/[\s\-\(\)]/g, '');

    // If starts with 0, replace with Nigeria country code
    if (cleaned.startsWith('0')) {
      cleaned = '234' + cleaned.substring(1);
    }

    // If doesn't start with +, add it
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Mask phone number for logging
   */
  private maskPhoneNumber(phone: string): string {
    if (phone.length < 6) return '***';
    return phone.substring(0, 4) + '****' + phone.substring(phone.length - 2);
  }
}
