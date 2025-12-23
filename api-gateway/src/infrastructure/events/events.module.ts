import { Module } from '@nestjs/common';
import { OrderEventsController } from './order-events.controller';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [
    QueueModule,
  ],
  controllers: [
    OrderEventsController,
  ],
})
export class EventsModule {}

