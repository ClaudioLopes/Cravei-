import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ScoringConfigDto } from '../groups/dto/scoring-config.dto';
import { calcularPontos } from './scoring-rules';

@Injectable()
export class ScoringService {
  private readonly logger = new Logger(ScoringService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Recalcula pontos de todos os palpites de um jogo encerrado, para cada grupo dos participantes.
  // Idempotente: pode ser chamado de novo (ex.: correção de placar) sem gerar pontuação duplicada.
  async calculateForMatch(matchId: string): Promise<void> {
    const match = await this.prisma.match.findUnique({
      where: { id: matchId },
      include: { round: true },
    });
    if (!match || match.placarCasa === null || match.placarFora === null) {
      return;
    }

    const predictions = await this.prisma.prediction.findMany({
      where: { matchId },
    });
    if (predictions.length === 0) {
      return;
    }

    const userIds = predictions.map((p) => p.userId);
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId: { in: userIds } },
      include: { group: true },
    });

    const affected = new Set<string>(); // `${groupId}:${userId}`

    for (const membership of memberships) {
      const prediction = predictions.find((p) => p.userId === membership.userId);
      if (!prediction) continue;

      const config = membership.group.scoringConfig as unknown as ScoringConfigDto;
      const pontos = calcularPontos(
        {
          placarCasaPalpite: prediction.placarCasaPalpite,
          placarForaPalpite: prediction.placarForaPalpite,
        },
        { placarCasa: match.placarCasa, placarFora: match.placarFora },
        config,
      );

      await this.prisma.predictionScore.upsert({
        where: {
          groupId_predictionId: {
            groupId: membership.groupId,
            predictionId: prediction.id,
          },
        },
        create: { groupId: membership.groupId, predictionId: prediction.id, pontos },
        update: { pontos },
      });

      affected.add(`${membership.groupId}:${membership.userId}`);
    }

    for (const key of affected) {
      const [groupId, userId] = key.split(':');
      await this.recomputeStanding(groupId, userId, match.round.turno);
    }

    this.logger.log(
      `Pontuação recalculada para o jogo ${matchId} (${affected.size} participações afetadas).`,
    );
  }

  private async recomputeStanding(groupId: string, userId: string, turno: number) {
    const scores = await this.prisma.predictionScore.findMany({
      where: {
        groupId,
        prediction: { userId, match: { round: { turno } } },
      },
    });
    const pontosTotais = scores.reduce((soma, s) => soma + s.pontos, 0);

    await this.prisma.standing.upsert({
      where: { groupId_turno_userId: { groupId, turno, userId } },
      create: { groupId, turno, userId, pontosTotais },
      update: { pontosTotais },
    });
  }
}
