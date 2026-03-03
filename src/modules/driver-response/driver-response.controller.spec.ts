import { Test, TestingModule } from '@nestjs/testing';
import { DriverResponseController } from './driver-response.controller';

describe('DriverResponseController', () => {
  let controller: DriverResponseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DriverResponseController],
    }).compile();

    controller = module.get<DriverResponseController>(DriverResponseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
