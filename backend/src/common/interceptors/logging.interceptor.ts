import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, ip } = request;
        const userAgent = request.get('user-agent') || '';
        const startTime = Date.now();

        // Log request
        this.logger.log(
            `→ ${method} ${url} - IP: ${ip} - UA: ${userAgent.substring(0, 50)}`
        );

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const response = context.switchToHttp().getResponse();
                    const { statusCode } = response;
                    const duration = Date.now() - startTime;

                    // Log successful response
                    this.logger.log(
                        `← ${method} ${url} - Status: ${statusCode} - Duration: ${duration}ms`
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;

                    // Log error response
                    this.logger.error(
                        `← ${method} ${url} - Error: ${error.message} - Duration: ${duration}ms`
                    );
                },
            })
        );
    }
}
