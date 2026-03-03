import { Test, TestingModule } from '@nestjs/testing';
import { DriverLocationController } from './driver-location.controller';
import { DriverLocationService } from './driver-location.service';

describe('DriverLocationController', () => {
  let controller: DriverLocationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriverLocationController],
      providers: [DriverLocationService],
    }).compile();

    controller = module.get<DriverLocationController>(DriverLocationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
