import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../../infrastructure/libs/guards/jwt-auth.guard';
import { RolesGuard } from '../../../infrastructure/libs/guards/roles.guard';
import { Roles } from '../../../infrastructure/libs/decorators/roles.decorator';
import { CurrentUser, CurrentUserPayload } from '../../../infrastructure/libs/decorators/current-user.decorator';
import { UserRole } from '../../../domain/entities/user.entity';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';
import { ApiGetProfile, ApiGetAllUsers } from '../../../infrastructure/libs/swagger/user-api-docs.decorator';

@ApiController('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  @Get('me')
  @ApiGetProfile()
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return user;
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiGetAllUsers()
  getAllUsers() {
    return { message: 'List all users - Admin only endpoint' };
  }
}
