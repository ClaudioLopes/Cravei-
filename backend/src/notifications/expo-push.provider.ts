import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PushMessage, PushProvider } from './push-provider.interface';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface ExpoTicket {
  status: 'ok' | 'error';
  message?: string;
  details?: { error?: string };
}

// Envia push de verdade via serviço de push do Expo (recomendado para apps Expo managed —
// evita lidar com credenciais cruas de FCM/APNs no backend; o Expo repassa pra Firebase/Apple
// usando as credenciais configuradas no próprio projeto Expo, ver docs/PUBLICAR.md seção 7).
@Injectable()
export class ExpoPushProvider implements PushProvider {
  private readonly logger = new Logger(ExpoPushProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async send(message: PushMessage): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: message.userId },
      select: { pushToken: true },
    });

    if (!user?.pushToken) {
      this.logger.debug(
        `Usuário ${message.userId} não tem push token registrado ainda — ignorando.`,
      );
      return;
    }

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: user.pushToken,
        title: message.title,
        body: message.body,
        data: message.data,
      }),
    });

    if (!response.ok) {
      throw new Error(`Expo push API respondeu ${response.status}: ${await response.text()}`);
    }

    const result = (await response.json()) as { data?: ExpoTicket };
    const ticket = result.data;

    if (ticket?.status === 'error') {
      // token inválido/expirado (ex.: app desinstalado) — limpa pra não tentar de novo à toa
      if (ticket.details?.error === 'DeviceNotRegistered') {
        await this.prisma.user.update({
          where: { id: message.userId },
          data: { pushToken: null },
        });
      }
      throw new Error(`Expo push falhou: ${ticket.message}`);
    }
  }
}
