import { Controller, Post, Body, Get, HttpCode, Logger } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse } from '@shared/index';

@Controller('api/auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Post('magic-link')
  async signInWithMagicLink(
    @Body('email') email: string,
  ): Promise<AuthResponse> {
    this.logger.log(`[Auth] Magic link requested for patient: ${email}`);
    const response = await this.authService.signInWithMagicLink(email);
    this.logger.log(`[Auth] Successful login completed for patient: ${email}`);
    return response;
  }

  @Get('health')
  getHealth(): string {
    return 'OK';
  }

  @Post('get-role')
  @HttpCode(200)
  async getRole(@Body('email') email: string): Promise<{ role: string }> {
    this.logger.log(`[Auth] Role requested for email: ${email}`);
    return this.authService.getRole(email);
  }

  @Post('send-reset-password')
  @HttpCode(200)
  async sendResetPassword(
    @Body('email') email: string,
  ): Promise<{ success: boolean; message?: string }> {
    this.logger.log(`[Auth] Password reset requested for email: ${email}`);
    return this.authService.sendResetPassword(email);
  }
}
