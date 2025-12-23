import { UserRole } from '../entities/user.entity';

/**
 * User information returned in authentication responses
 */
export interface IAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string | UserRole;
}

/**
 * Response for register and login endpoints
 */
export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: IAuthUser;
}

/**
 * Response for refresh token endpoint
 */
export interface IRefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * Response for logout endpoint
 */
export interface ILogoutResponse {
  message: string;
}

