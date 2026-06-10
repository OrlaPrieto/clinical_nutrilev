import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Ocurrió un error inesperado en el servidor';
    let errorDetails = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const resContent = exception.getResponse() as any;
      message = typeof resContent === 'object' ? resContent.message || resContent.error : resContent;
    } else {
      // It's a non-HTTP exception (e.g. database error, python connection error, generic runtime error)
      const errorMsg = exception instanceof Error ? exception.message : String(exception);
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}: ${errorMsg}`,
        exception?.stack
      );

      // Check if it's an Axios/HttpService request error
      if (exception.isAxiosError) {
        status = exception.response?.status || HttpStatus.BAD_GATEWAY;
        message = 'El servicio de IA no responde o devolvió un error';
        errorDetails = exception.response?.data?.details || exception.response?.data?.error || null;
      }
      // Check if it's a Supabase/Postgres database error
      else if (exception.code && typeof exception.code === 'string' && exception.message && exception.details) {
        // Postgres error code format
        status = HttpStatus.INTERNAL_SERVER_ERROR;
        message = 'Error de comunicación con la base de datos clínica';
      }
    }

    // Standardized error JSON payload
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message, // take the first validation message if array
      details: errorDetails,
    });
  }
}
