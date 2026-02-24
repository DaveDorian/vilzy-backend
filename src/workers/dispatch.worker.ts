import { NestFactory } from '@nestjs/core';
import { AppModule } from 'src/app.module';
import { DispatchService } from 'src/modules/dispatch/dispatch.service';
import IORedis from 'ioredis';
import { Worker } from 'bullmq';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);

  const dispatchService = app.get(DispatchService);

  const connection = new IORedis({
    host: 'localhost',
    port: 6379,
  });

  new Worker(
    'dispatch',
    async (job) => {
      const { orderId } = job.data;

      if (job.name === 'dispatch-order')
        await dispatchService.matchOrder(orderId);

      if (job.name === 'redispatch-order')
        await dispatchService.handleRedispatch(orderId);
    },
    { connection: connection.options, concurrency: 10 },
  );

  console.log('Dispatch Worker running...');
}

bootstrap();
