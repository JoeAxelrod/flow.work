import { Controller, Get, Post, All } from '@nestjs/common';
import { FakeApiService } from './fake-api.service';

@Controller('fake-api')
export class FakeApiController {
  constructor(private readonly fakeApiService: FakeApiService) {}

  // @Get()
  // @Post()
  @All()
  async getFakeApi() {
    const counter = await this.fakeApiService.incrementCounter();
    return {
      counter,
      message: 'Fake API endpoint',
      timestamp: new Date().toISOString()
    };
  }
}



