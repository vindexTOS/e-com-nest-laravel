import { RegisterDto, LoginDto } from '../../dto/auth';
import { IAuthResponse, IRefreshTokenResponse } from '../auth-response.interface';

export interface IAuthService {
  register(registerDto: RegisterDto): Promise<IAuthResponse>;
  login(loginDto: LoginDto): Promise<IAuthResponse>;
  refreshToken(refreshToken: string): Promise<IRefreshTokenResponse>;
  logout(accessToken: string, refreshToken?: string): Promise<void>;
}

