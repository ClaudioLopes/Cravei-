import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const LEAD_MINUTES = Number(process.env.NOTIFICATION_LEAD_MINUTES ?? 15);

@Injectable()
export class NotificationsSchedulerService {
  private readonly logger = new Logger(NotificationsSchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // regra 5.5: dispara 15 min antes do primeiro jogo da rodada, só para quem tem palpite pendente
  @Cron(CronExpression.EVERY_MINUTE)
  async checkUpcomingRounds() {
    const now = new Date();
    const janela = new Date(now.getTime() + LEAD_MINUTES * 60_000);

    const rounds = await this.prisma.round.findMany({
      where: {
        notificacaoEnviada: false,
        encerrada: false,
        primeiroJogoOriginal: { gt: now, lte: janela },
      },
      include: { matches: true },
    });

    for (const round of rounds) {
      if (round.matches.length === 0) continue;
      await this.notifyPendingMembers(round.id, round.matches.map((m) => m.id));
      await this.prisma.round.update({
        where: { id: round.id },
        data: { notificacaoEnviada: true },
      });
    }
  }

  private async notifyPendingMembers(roundId: string, matchIds: string[]) {
    const groups = await this.prisma.group.findMany({
      include: { members: { include: { user: true } } },
    });

    for (const group of groups) {
      for (const membro of group.members) {
        const totalPalpites = await this.prisma.prediction.count({
          where: { userId: membro.userId, matchId: { in: matchIds } },
        });

        if (totalPalpites < matchIds.length) {
          await this.notificationsService.queue(
            membro.userId,
            'Rodada fechando!',
            `Faltam ${matchIds.length - totalPalpites} palpite(s) no grupo "${group.nome}" antes do início da rodada.`,
            { roundId, groupId: group.id },
          );
        }
      }
      this.logger.log(`Verificação de palpites pendentes concluída para o grupo ${group.id}.`);
    }
  }
}
