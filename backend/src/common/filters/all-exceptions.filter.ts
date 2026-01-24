import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse();
        const request = ctx.getRequest();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const message =
            exception instanceof HttpException
                ? exception.getResponse()
                : exception;

        // Log full error details server-side for debugging
        this.logger.error(
            `Http Status: ${status} Error Message: ${JSON.stringify(message)}`,
        );

        if (request.file) {
            this.logger.log(`Request contained file: ${request.file.originalname} (${request.file.mimetype})`);
        }

        // Sanitize error message for client to avoid leaking sensitive information
        let clientMessage: any = message;
        if (status === HttpStatus.INTERNAL_SERVER_ERROR && !(exception instanceof HttpException)) {
            // Don't leak internal error details to client
            clientMessage = {
                message: 'Internal server error',
                error: 'Internal Server Error',
            };
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            timestamp: new Date().toISOString(),
            path: request.url,
            error: clientMessage,
        });
    }
}
