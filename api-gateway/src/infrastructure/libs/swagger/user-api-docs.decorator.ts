import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export const ApiGetProfile = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Get current user profile' }),
    ApiResponse({ status: 200, description: 'User profile retrieved successfully' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );

export const ApiGetAllUsers = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'List all users (Admin only)' }),
    ApiResponse({ status: 200, description: 'Users retrieved successfully' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
    ApiResponse({ status: 403, description: 'Forbidden - Admin access required' }),
  );

