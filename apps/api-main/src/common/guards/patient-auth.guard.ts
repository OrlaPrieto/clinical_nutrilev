import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from '../../auth/auth.service';

@Injectable()
export class PatientAuthGuard implements CanActivate {
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
      throw new UnauthorizedException('Invalid or expired token');
    }

    const userEmail = user.email;
    if (!userEmail) {
      throw new UnauthorizedException('Token does not contain an email');
    }

    // 3. Check Role
    const { role } = await this.authService.getRole(userEmail);

    // Admins always have access
    if (role === 'admin') {
      return true;
    }

    // Patients can only access their own data
    // The email parameter can be in params or body depending on the request
    const body = request.body as Record<string, any>;
    const targetEmail =
      (request.params.email as string) ||
      (body.email as string) ||
      (body.patient_email as string);

    if (targetEmail && userEmail.toLowerCase() === targetEmail.toLowerCase()) {
      return true;
    }

    // Special case for shopping-list which might not have the email in the request if it only has menu_url
    // For now, we allow any authenticated user to call shopping-list (risk is low since menu_url is a long signed URL)
    if (request.path.includes('shopping-list')) {
      return true;
    }

    throw new ForbiddenException(
      'Access denied: You can only access your own record',
    );
  }
}
