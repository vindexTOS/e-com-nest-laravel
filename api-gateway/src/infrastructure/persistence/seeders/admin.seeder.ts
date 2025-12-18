import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../../../domain/entities/user.entity';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AdminSeeder implements OnModuleInit {
  private readonly logger = new Logger(AdminSeeder.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedAdmin();
  }

  async seedAdmin(): Promise<void> {
    try {
      const adminEmail = 'admin@gmail.com';
      const adminPassword = '1234567';

      const existingAdmin = await this.userRepository.findOne({
        where: { email: adminEmail },
      });

      if (existingAdmin) {
        this.logger.log(`Admin user already exists: ${adminEmail}`);
        return;
      }

      const hashedPassword = await bcrypt.hash(adminPassword, 10);

      const admin = this.userRepository.create({
        email: adminEmail,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'User',
        role: UserRole.ADMIN,
        isActive: true,
        emailVerifiedAt: new Date(),
      });

      await this.userRepository.save(admin);

      this.logger.log(`✅ Admin user created successfully: ${adminEmail}`);
      this.logger.warn(`⚠️  Default password: ${adminPassword} - Please change in production!`);
    } catch (error) {
      this.logger.error('Failed to seed admin user:', error);
    }
  }
}

