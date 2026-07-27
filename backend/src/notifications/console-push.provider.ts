import { Injectable, Logger } from '@nestjs/common';
import { PushMessage, PushProvider } from './push-provider.interface';

@Injectable()
export class ConsolePushProvider implements PushProvider {
  private readonly logger = new Logger('PushNotification');

  async send(message: PushMessage): Promise<void> {
    this.logger.log(
      `[MVP: sem FCM configurado] Push para usuário ${message.userId}: "${message.title}" — ${message.body}`,
    );
  }
}
