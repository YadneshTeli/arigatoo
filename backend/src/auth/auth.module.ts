import { Module, forwardRef } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FirebaseAuthGuard } from './guards/firebase-auth.guard';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
    imports: [FirebaseModule],
    controllers: [AuthController],
    providers: [AuthService, FirebaseAuthGuard],
    exports: [AuthService, FirebaseAuthGuard],
})
export class AuthModule { }
