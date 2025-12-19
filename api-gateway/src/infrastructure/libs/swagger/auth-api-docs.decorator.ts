import { applyDecorators } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

export const ApiRegister = () =>
  applyDecorators(
    ApiOperation({ summary: 'Register a new customer' }),
    ApiResponse({ status: 201, description: 'User registered successfully' }),
    ApiResponse({ status: 400, description: 'Validation error' }),
    ApiResponse({ status: 409, description: 'Email already exists' }),
  );

export const ApiLogin = () =>
  applyDecorators(
    ApiOperation({ summary: 'Login (Customer or Admin)' }),
    ApiResponse({ status: 200, description: 'Login successful' }),
    ApiResponse({ status: 400, description: 'Validation error' }),
    ApiResponse({ status: 401, description: 'Invalid credentials' }),
  );

export const ApiRefreshToken = () =>
  applyDecorators(
    ApiOperation({ summary: 'Refresh access token' }),
    ApiResponse({ status: 200, description: 'Token refreshed successfully' }),
    ApiResponse({ status: 401, description: 'Invalid refresh token' }),
  );

export const ApiLogout = () =>
  applyDecorators(
    ApiBearerAuth(),
    ApiOperation({ summary: 'Logout and invalidate tokens' }),
    ApiResponse({ status: 200, description: 'Logged out successfully' }),
    ApiResponse({ status: 401, description: 'Unauthorized' }),
  );

