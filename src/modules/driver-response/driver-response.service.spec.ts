import { Test, TestingModule } from '@nestjs/testing';
import { DriverResponseService } from './driver-response.service';

describe('DriverResponseService', () => {
  let service: DriverResponseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DriverResponseService],
    }).compile();

    service = module.get<DriverResponseService>(DriverResponseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
