import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { DatabaseModule } from './infrastructure/persistence/database.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { ElasticsearchModule } from './infrastructure/search/elasticsearch.module';
import { GqlModule } from './infrastructure/graphql/graphql.module';
import { EmailModule } from './infrastructure/services/email/email.module';
import { EventsModule } from './infrastructure/events/events.module';
import { QueueModule } from './infrastructure/queue/queue.module';
import { ControllersModule } from './application/controllers/controllers.module';
import { InfrastructureModule } from './infrastructure/infrastructure.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      expandVariables: true,
    }),
    HttpModule,
    DatabaseModule,
    RedisModule,
    ElasticsearchModule,
    GqlModule,
    EmailModule,
    QueueModule,
    EventsModule,
    ControllersModule,
    InfrastructureModule,
  ],
})
export class AppModule {}
