import { IoAdapter } from '@nestjs/platform-socket.io';
import { ServerOptions } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { Redis } from 'ioredis';
import { INestApplicationContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor!: ReturnType<typeof createAdapter>;

  constructor(
    app: INestApplicationContext,
    private configService: ConfigService,
  ) {
    super(app);
  }

  async connectToRedis(): Promise<void> {
    const redisHost = this.configService.get<string>('REDIS_HOST', 'localhost');
    const redisPort = this.configService.get<number>('REDIS_PORT', 6379);

    const pubClient = new Redis({ host: redisHost, port: redisPort });
    const subClient = pubClient.duplicate();

    await Promise.all([
      new Promise<void>((resolve) => pubClient.once('ready', resolve)),
      new Promise<void>((resolve) => subClient.once('ready', resolve)),
    ]);

    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  createIOServer(port: number, options?: ServerOptions): any {
    const server = super.createIOServer(port, options);
    server.adapter(this.adapterConstructor);
    return server;
  }
}
