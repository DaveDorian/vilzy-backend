import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';

@Injectable()
export class QueueService {
  private connection: IORedis;
  private dispatchQueue: Queue;

  constructor() {
    this.connection = new IORedis({
      host: 'localhost',
      port: 6379,
    });

    this.dispatchQueue = new Queue('dispatch', {
      connection: this.connection.options,
    });
  }

  getDispatchQueue() {
    return this.dispatchQueue;
  }
}
