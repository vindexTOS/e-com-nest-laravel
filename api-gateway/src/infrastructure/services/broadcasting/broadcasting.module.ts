import { Module } from '@nestjs/common';
import { SoketiService } from './soketi.service';

@Module({
  providers: [SoketiService],
  exports: [SoketiService],
})
export class BroadcastingModule {}

