import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { MatchStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';

const JOGO_JA_COMECOU_STATUS: MatchStatus[] = [
  MatchStatus.EM_ANDAMENTO,
  MatchStatus.ENCERRADO,
];

@Injectable()
export class PredictionsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, dto: CreatePredictionDto) {
    const match = await this.prisma.match.findUnique({
      where: { id: dto.matchId },
      include: { round: true },
    });
    if (!match) {
      throw new NotFoundException('Jogo não encontrado.');
    }

    // regra 5.1: sempre validado no backend, nunca confiar apenas no client
    const deadline = match.prazoIndividual ?? match.round.primeiroJogoOriginal;
    if (new Date() >= deadline) {
      throw new ForbiddenException(
        'O prazo para enviar ou editar o palpite deste jogo já encerrou.',
      );
    }

    const existing = await this.prisma.prediction.findUnique({
      where: { matchId_userId: { matchId: dto.matchId, userId } },
    });

    const prediction = await this.prisma.prediction.upsert({
      where: { matchId_userId: { matchId: dto.matchId, userId } },
      create: {
        matchId: dto.matchId,
        userId,
        placarCasaPalpite: dto.placarCasaPalpite,
        placarForaPalpite: dto.placarForaPalpite,
      },
      update: {
        placarCasaPalpite: dto.placarCasaPalpite,
        placarForaPalpite: dto.placarForaPalpite,
      },
    });

    if (!existing) {
      await this.lockGroupsScoringRule(userId, match.round.turno);
    }

    return prediction;
  }

  async getMine(userId: string, roundId: string) {
    return this.prisma.prediction.findMany({
      where: { userId, match: { roundId } },
    });
  }

  async getForMatch(userId: string, matchId: string) {
    const match = await this.prisma.match.findUnique({ where: { id: matchId } });
    if (!match) {
      throw new NotFoundException('Jogo não encontrado.');
    }

    const jogoComecou = JOGO_JA_COMECOU_STATUS.includes(match.status);
    if (!jogoComecou) {
      // regra 5.4: antes do início, cada participante só vê o próprio palpite
      const own = await this.prisma.prediction.findUnique({
        where: { matchId_userId: { matchId, userId } },
      });
      return own ? [own] : [];
    }

    return this.prisma.prediction.findMany({
      where: { matchId },
      include: { user: { select: { id: true, nome: true, foto: true } } },
    });
  }

  // regra 5.2: trava a regra de pontuação do grupo assim que o primeiro palpite do turno é enviado
  private async lockGroupsScoringRule(userId: string, turno: number) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });

    for (const { groupId } of memberships) {
      const jaTravada = await this.prisma.groupTurnoLock.findUnique({
        where: { groupId_turno: { groupId, turno } },
      });
      if (!jaTravada) {
        await this.prisma.groupTurnoLock.create({ data: { groupId, turno } });
      }
    }
  }
}
