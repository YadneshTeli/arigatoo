import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from '@upstash/redis';

@Injectable()
export class RedisService {
    private redis: Redis | null = null;

    constructor(private configService: ConfigService) {
        const url = this.configService.get<string>('UPSTASH_REDIS_REST_URL');
        const token = this.configService.get<string>('UPSTASH_REDIS_REST_TOKEN');

        if (url && token) {
            this.redis = new Redis({ url, token });
            console.log('✅ Upstash Redis connected');
        } else {
            console.warn('⚠️ Upstash Redis not configured, using in-memory fallback');
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.redis) return null;
        try {
            return await this.redis.get<T>(key);
        } catch (error) {
            console.error('Redis get error:', error);
            return null;
        }
    }

    async set(key: string, value: any, exSeconds?: number): Promise<void> {
        if (!this.redis) return;
        try {
            if (exSeconds) {
                await this.redis.set(key, value, { ex: exSeconds });
            } else {
                await this.redis.set(key, value);
            }
        } catch (error) {
            console.error('Redis set error:', error);
        }
    }

    async del(key: string): Promise<void> {
        if (!this.redis) return;
        try {
            await this.redis.del(key);
        } catch (error) {
            console.error('Redis del error:', error);
        }
    }

    isConnected(): boolean {
        return this.redis !== null;
    }
}
