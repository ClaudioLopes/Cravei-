import { Inject, Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma, PushStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PUSH_PROVIDER, PushProvider } from './push-provider.interface';

const MAX_TENTATIVAS = 5;

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PUSH_PROVIDER) private readonly pushProvider: PushProvider,
  ) {}

  async queue(userId: string, title: string, body: string, data?: Record<string, unknown>) {
    return this.prisma.pushOutbox.create({
      data: { userId, title, body, data: data as Prisma.InputJsonValue },
    });
  }

  // Requisito não-funcional (seção 9): retry em caso de falha no envio.
  @Cron(CronExpression.EVERY_MINUTE)
  async dispatchPending() {
    const pendentes = await this.prisma.pushOutbox.findMany({
      where: {
        status: { in: [PushStatus.PENDENTE, PushStatus.FALHOU] },
        tentativas: { lt: MAX_TENTATIVAS },
      },
      take: 100,
    });

    for (const item of pendentes) {
      try {
        await this.pushProvider.send({
          userId: item.userId,
          title: item.title,
          body: item.body,
          data: (item.data as Record<string, unknown>) ?? undefined,
        });
        await this.prisma.pushOutbox.update({
          where: { id: item.id },
          data: { status: PushStatus.ENVIADO, tentativas: item.tentativas + 1 },
        });
      } catch (error) {
        this.logger.warn(`Falha ao enviar push ${item.id}: ${(error as Error).message}`);
        await this.prisma.pushOutbox.update({
          where: { id: item.id },
          data: { status: PushStatus.FALHOU, tentativas: item.tentativas + 1 },
        });
      }
    }
  }
}
