import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../interface';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    const body: ApiResponse<null> = {
      success: false,
      message: this.extractMessage(exception),
      data: null,
    };

    response.status(status).json(body);
  }

  private extractMessage(exception: unknown): string {
    if (!(exception instanceof HttpException)) {
      return 'Lỗi hệ thống, vui lòng thử lại sau';
    }

    const res = exception.getResponse();
    if (typeof res === 'string') return res;

    if (typeof res === 'object' && res !== null && 'message' in res) {
      const message = (res as { message: unknown }).message;
      if (Array.isArray(message)) return message.join(', ');
      if (typeof message === 'string') return message;
    }

    return exception.message;
  }
}
