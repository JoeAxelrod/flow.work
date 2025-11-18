import { Controller, Post, Body } from '@nestjs/common';
import { EventsService } from './events.service';

@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('timer')
  handleTimerEvent(@Body() timerEvent: any) {
    return this.eventsService.handleTimerEvent(timerEvent);
  }

  @Post('webhook')
  handleWebhook(@Body() webhookData: any) {
    return this.eventsService.handleWebhook(webhookData);
  }
}
