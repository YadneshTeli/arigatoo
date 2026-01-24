import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import * as admin from 'firebase-admin';
import type { User } from 'arigatoo-shared';

@Injectable()
export class AuthService {
    constructor(
        @Inject('FIREBASE_AUTH') private readonly firebaseAuth: admin.auth.Auth | null,
        @Inject('FIREBASE_FIRESTORE') private readonly firestore: admin.firestore.Firestore | null,
    ) { }

    async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
        if (!this.firebaseAuth) {
            throw new UnauthorizedException('Firebase Auth not configured');
        }
        try {
            return await this.firebaseAuth.verifyIdToken(idToken);
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired token');
        }
    }

    async getOrCreateUser(decodedToken: admin.auth.DecodedIdToken): Promise<User> {
        if (!this.firestore) {
            // Return user from token without Firestore
            return {
                id: decodedToken.uid,
                email: decodedToken.email || '',
                displayName: decodedToken.name,
                photoURL: decodedToken.picture,
                provider: this.getProvider(decodedToken),
                createdAt: new Date(),
                updatedAt: new Date(),
            };
        }

        const userRef = this.firestore.collection('users').doc(decodedToken.uid);
        const userDoc = await userRef.get();

        if (userDoc.exists) {
            const data = userDoc.data();
            return {
                id: decodedToken.uid,
                email: data?.email || decodedToken.email || '',
                displayName: data?.displayName || decodedToken.name,
                photoURL: data?.photoURL || decodedToken.picture,
                provider: data?.provider || this.getProvider(decodedToken),
                createdAt: data?.createdAt?.toDate() || new Date(),
                updatedAt: new Date(),
            };
        }

        // Create new user
        const newUser: User = {
            id: decodedToken.uid,
            email: decodedToken.email || '',
            displayName: decodedToken.name,
            photoURL: decodedToken.picture,
            provider: this.getProvider(decodedToken),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await userRef.set({
            ...newUser,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return newUser;
    }

    private getProvider(decodedToken: admin.auth.DecodedIdToken): 'email' | 'google' {
        const providerId = decodedToken.firebase?.sign_in_provider;
        if (providerId?.includes('google')) return 'google';
        return 'email';
    }

    async getUserById(userId: string): Promise<User | null> {
        if (!this.firestore) return null;

        const userDoc = await this.firestore.collection('users').doc(userId).get();
        if (!userDoc.exists) return null;

        const data = userDoc.data();
        return {
            id: userId,
            email: data?.email || '',
            displayName: data?.displayName,
            photoURL: data?.photoURL,
            provider: data?.provider || 'email',
            createdAt: data?.createdAt?.toDate() || new Date(),
            updatedAt: data?.updatedAt?.toDate() || new Date(),
        };
    }
}
