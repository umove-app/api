import * as bcrypt from 'bcrypt';

export class HashUtil {
  private static readonly SALT_ROUNDS = 10;

  static async hash(plainText: string): Promise<string> {
    return await bcrypt.hash(plainText, this.SALT_ROUNDS);
  }

  static async compare(plainText: string, hash: string): Promise<boolean> {
    return await bcrypt.compare(plainText, hash);
  }

  static generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
  }

  static generateRandomToken(length: number = 32): string {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = '';
    for (let i = 0; i < length; i++) {
      token += characters[Math.floor(Math.random() * characters.length)];
    }
    return token;
  }
}
