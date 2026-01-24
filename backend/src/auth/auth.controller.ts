import { Controller, Post, Get, Body, Headers, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Post('verify')
    async verifyToken(@Headers('authorization') authHeader: string) {
        const token = authHeader?.replace('Bearer ', '');
        if (!token) {
            return { success: false, error: 'No token provided' };
        }

        const decodedToken = await this.authService.verifyIdToken(token);
        const user = await this.authService.getOrCreateUser(decodedToken);

        return {
            success: true,
            data: { user },
        };
    }

    @Get('me')
    @UseGuards(FirebaseAuthGuard)
    async getCurrentUser(@Req() req: any) {
        return {
            success: true,
            data: { user: req.user },
        };
    }
}
