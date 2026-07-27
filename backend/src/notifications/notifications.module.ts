import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { ConsolePushProvider } from './console-push.provider';
import { PUSH_PROVIDER } from './push-provider.interface';

@Module({
  providers: [
    NotificationsService,
    NotificationsSchedulerService,
    ConsolePushProvider,
    { provide: PUSH_PROVIDER, useClass: ConsolePushProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
