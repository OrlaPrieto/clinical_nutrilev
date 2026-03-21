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

    console.log('AdminGuard: Headers:', {
      'x-user-email': request.headers['x-user-email'],
      'content-type': request.headers['content-type'],
    });

    // In a production environment, we would also verify the JWT from Supabase
    // For now, we rely on the custom AuthService role check based on email
    // which is used to identify the actor (Nutritionist)

    const body = request.body as { email?: string; patient_email?: string };
    const email =
      (request.headers['x-user-email'] as string) ||
      body?.email ||
      body?.patient_email ||
      (request.params?.email as string);

    if (!email) {
      throw new UnauthorizedException(
        'User email not provided for admin check',
      );
    }

    const { role } = await this.authService.getRole(email);

    if (role !== 'admin') {
      throw new UnauthorizedException('Operation restricted to administrators');
    }

    return true;
  }
}
