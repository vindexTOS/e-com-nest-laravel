import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class DatabaseConnectionHelper {
  constructor(
    @InjectDataSource('write') private readonly writeDataSource: DataSource,
    @InjectDataSource('read') private readonly readDataSource: DataSource,
    @InjectDataSource() private readonly defaultDataSource: DataSource,
  ) {}

  getWriteConnection(): DataSource {
    return this.writeDataSource;
  }

  getReadConnection(): DataSource {
    return this.readDataSource;
  }

  getDefaultConnection(): DataSource {
    return this.defaultDataSource;
  }

  async withWriteConnection<T>(fn: (connection: DataSource) => Promise<T>): Promise<T> {
    return fn(this.writeDataSource);
  }

  async withReadConnection<T>(fn: (connection: DataSource) => Promise<T>): Promise<T> {
    return fn(this.readDataSource);
  }
}

