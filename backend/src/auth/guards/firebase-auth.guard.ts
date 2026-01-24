import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Inject } from '@nestjs/common';
import { AuthService } from '../auth.service';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
    constructor(private readonly authService: AuthService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;

        if (!authHeader?.startsWith('Bearer ')) {
            throw new UnauthorizedException('No token provided');
        }

        const token = authHeader.replace('Bearer ', '');

        try {
            const decodedToken = await this.authService.verifyIdToken(token);
            const user = await this.authService.getOrCreateUser(decodedToken);
            request.user = user;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }
}
