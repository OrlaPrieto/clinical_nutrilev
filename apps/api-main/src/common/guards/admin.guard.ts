import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // 1. Extract Token
    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No authorization token provided');
    }

    const token = authHeader.split(' ')[1];

    // 2. Verify with Supabase
    const {
      data: { user },
      error,
    } = await this.authService.verifyToken(token);

    if (error || !user) {
      console.error('AdminGuard: JWT Verification failed:', error);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const email = user.email;
    if (!email) {
      throw new UnauthorizedException('Token does not contain an email');
    }

    // 3. Check Role
    const { role } = await this.authService.getRole(email);

    if (role !== 'admin') {
      console.warn(`AdminGuard: Access denied for ${email} (Role: ${role})`);
      throw new UnauthorizedException('Operation restricted to administrators');
    }

    return true;
  }
}
