import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Global()
@Module({
    providers: [
        {
            provide: 'FIREBASE_ADMIN',
            useFactory: (configService: ConfigService) => {
                const projectId = configService.get<string>('FIREBASE_PROJECT_ID');
                const clientEmail = configService.get<string>('FIREBASE_CLIENT_EMAIL');
                const privateKey = configService.get<string>('FIREBASE_PRIVATE_KEY')?.replace(/\\n/g, '\n');

                if (!projectId || !clientEmail || !privateKey) {
                    console.warn('Firebase credentials not fully configured');
                    return null;
                }

                if (!admin.apps.length) {
                    admin.initializeApp({
                        credential: admin.credential.cert({
                            projectId,
                            clientEmail,
                            privateKey,
                        }),
                    });
                }

                return admin;
            },
            inject: [ConfigService],
        },
        {
            provide: 'FIREBASE_AUTH',
            useFactory: (firebaseAdmin: typeof admin | null) => {
                return firebaseAdmin ? firebaseAdmin.auth() : null;
            },
            inject: ['FIREBASE_ADMIN'],
        },
        {
            provide: 'FIREBASE_FIRESTORE',
            useFactory: (firebaseAdmin: typeof admin | null) => {
                return firebaseAdmin ? firebaseAdmin.firestore() : null;
            },
            inject: ['FIREBASE_ADMIN'],
        },
    ],
    exports: ['FIREBASE_ADMIN', 'FIREBASE_AUTH', 'FIREBASE_FIRESTORE'],
})
export class FirebaseModule { }
