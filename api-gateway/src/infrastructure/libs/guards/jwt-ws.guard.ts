import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';
import { RedisService } from '../../cache/redis.service';

@Injectable()
export class JwtWsGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client: Socket = context.switchToWs().getClient();
    const token = this.extractToken(client);

    if (!token) {
      throw new WsException('Unauthorized');
    }

    try {
      const payload = this.jwtService.verify(token, { secret: 'TEST' });

      const isBlacklisted = await this.redisService.get<boolean>(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new WsException('Token has been revoked');
      }

      client.data.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
        firstName: payload.firstName ?? payload.first_name ?? null,
        lastName: payload.lastName ?? payload.last_name ?? null,
      };

      return true;
    } catch {
      throw new WsException('Unauthorized');
    }
  }

  private extractToken(client: Socket): string | null {
    const authHeader = client.handshake.auth?.token || client.handshake.headers?.authorization;
    if (!authHeader) return null;

    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    return authHeader;
  }
}

