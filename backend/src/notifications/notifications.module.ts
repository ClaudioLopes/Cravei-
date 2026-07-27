import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsSchedulerService } from './notifications-scheduler.service';
import { ExpoPushProvider } from './expo-push.provider';
import { PUSH_PROVIDER } from './push-provider.interface';

@Module({
  providers: [
    NotificationsService,
    NotificationsSchedulerService,
    ExpoPushProvider,
    { provide: PUSH_PROVIDER, useClass: ExpoPushProvider },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
