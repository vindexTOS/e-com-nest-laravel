import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { UsersService } from '../../../infrastructure/services/users/users.service';
import { ApiController } from '../../../infrastructure/libs/swagger/api-docs.decorator';

@ApiController('Users')
@Controller('users')
export class UserController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get all users (read-only)' })
  @ApiResponse({ status: 200, description: 'List of users' })
  async findAll(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ) {
    const parsedLimit = limit ? parseInt(limit.toString(), 10) : undefined;
    const parsedOffset = offset ? parseInt(offset.toString(), 10) : undefined;
    return this.usersService.findAll({
      limit: parsedLimit,
      offset: parsedOffset,
    });
  }
}
