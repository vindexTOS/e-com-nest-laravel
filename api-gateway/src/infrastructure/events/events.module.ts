import { Module } from '@nestjs/common';
import { OrderEventsController } from './order-events.controller';
import { EmailModule } from '../services/email/email.module';

@Module({
  imports: [
    EmailModule,
  ],
  controllers: [
    OrderEventsController,
  ],
})
export class EventsModule {}

