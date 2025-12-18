import { applyDecorators } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiResponseOptions } from '@nestjs/swagger';

export const ApiController = (tag: string) => applyDecorators(ApiTags(tag));

export const ApiEndpoint = (summary: string, description?: string) =>
  applyDecorators(ApiOperation({ summary, description }));

export const ApiAuthRequired = () => applyDecorators(ApiBearerAuth());

export const ApiSuccessResponse = (status: number, description: string, type?: any, options?: ApiResponseOptions) =>
  applyDecorators(ApiResponse({ status, description, type, ...options }));

export const ApiErrorResponse = (status: number, description: string) =>
  applyDecorators(ApiResponse({ status, description }));

export const ApiAuthEndpoint = (summary: string, description?: string) =>
  applyDecorators(ApiBearerAuth(), ApiOperation({ summary, description }));

