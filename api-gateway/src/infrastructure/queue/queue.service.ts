import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import type { SendOrderEmailJobData } from '../../domain/dto/queue/send-order-email-job.dto';

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('email')
    private readonly emailQueue: Queue,
  ) {}

  async addOrderConfirmationEmailJob(
    data: SendOrderEmailJobData,
  ): Promise<void> {
    try {
      const job = await this.emailQueue.add('send-order-confirmation', data, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      });

      this.logger.log(
        `Added order confirmation email job to queue: ${job.id} for order ${data.orderNumber}`,
      );
    } catch (error: any) {
      this.logger.error(
        `Failed to add email job to queue: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async getEmailQueueStats(): Promise<{
    waiting: number;
    active: number;
    completed: number;
    failed: number;
  }> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.emailQueue.getWaitingCount(),
      this.emailQueue.getActiveCount(),
      this.emailQueue.getCompletedCount(),
      this.emailQueue.getFailedCount(),
    ]);

    return { waiting, active, completed, failed };
  }
}
