import { UserRole } from '../entities/user.entity';

export interface IAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string | UserRole;
}

export interface IAuthResponse {
  accessToken: string;
  refreshToken: string;
  user: IAuthUser;
}

export interface IRefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
}

export interface ILogoutResponse {
  message: string;
}

export interface ILogoutBody {
  refreshToken?: string;
}

