import { Controller, Post, Body } from '@nestjs/common';
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

  @Post('get-role')
  async getRole(@Body('email') email: string): Promise<{ role: string }> {
    return this.authService.getRole(email);
  }
}
