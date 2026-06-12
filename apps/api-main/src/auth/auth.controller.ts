import { Controller, Post, Body, Get, HttpCode } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthResponse } from '@shared/index';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('magic-link')
  async signInWithMagicLink(
    @Body('email') email: string,
  ): Promise<AuthResponse> {
    return this.authService.signInWithMagicLink(email);
  }

  @Get('health')
  getHealth(): string {
    return 'OK';
  }

  @Post('get-role')
  @HttpCode(200)
  async getRole(@Body('email') email: string): Promise<{ role: string }> {
    return this.authService.getRole(email);
  }

  @Post('send-reset-password')
  @HttpCode(200)
  async sendResetPassword(
    @Body('email') email: string,
  ): Promise<{ success: boolean; message?: string }> {
    return this.authService.sendResetPassword(email);
  }
}
