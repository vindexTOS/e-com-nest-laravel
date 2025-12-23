import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from '../../../infrastructure/services/auth/auth.service';
import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
} from '../../../domain/dto/auth';
import {
  IAuthResponse,
  IRefreshTokenResponse,
  ILogoutResponse,
} from '../../../domain/interfaces';
import type { ILogoutBody } from '../../../domain/interfaces';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { Public } from '../../../infrastructure/libs/decorators/public.decorator';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';
import {
  ApiRegister,
  ApiLogin,
  ApiRefreshToken,
  ApiLogout,
} from '../../../infrastructure/libs/swagger/auth-api-docs.decorator';

@ApiController('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiRegister()
  async register(@Body() registerDto: RegisterDto): Promise<IAuthResponse> {
    return this.authService.register(registerDto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiLogin()
  async login(@Body() loginDto: LoginDto): Promise<IAuthResponse> {
    return this.authService.login(loginDto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiRefreshToken()
  async refresh(
    @Body() refreshTokenDto: RefreshTokenDto,
  ): Promise<IRefreshTokenResponse> {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiLogout()
  async logout(
    @Req() request: Request,
    @Body() body: ILogoutBody,
  ): Promise<ILogoutResponse> {
    const authHeader = request.headers.authorization;
    const accessToken = authHeader?.replace('Bearer ', '') || '';
    await this.authService.logout(accessToken, body.refreshToken);
    return { message: 'Logged out successfully' };
  }
}
