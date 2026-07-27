import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StandingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getStandings(userId: string, groupId: string, turno?: number) {
    await this.assertMember(userId, groupId);

    const turnoResolvido = turno ?? (await this.turnoAtual());

    const standings = await this.prisma.standing.findMany({
      where: { groupId, turno: turnoResolvido },
      orderBy: { pontosTotais: 'desc' },
      include: { user: { select: { id: true, nome: true, foto: true } } },
    });

    return standings.map((s, index) => ({ posicao: index + 1, ...s }));
  }

  async getHistory(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);

    const winners = await this.prisma.turnoWinner.findMany({
      where: { groupId },
      orderBy: { turno: 'asc' },
      include: { user: { select: { id: true, nome: true, foto: true } } },
    });
    return winners;
  }

  async getTurnoWinner(userId: string, groupId: string, turno: number) {
    await this.assertMember(userId, groupId);
    return this.prisma.turnoWinner.findUnique({
      where: { groupId_turno: { groupId, turno } },
      include: { user: { select: { id: true, nome: true, foto: true } } },
    });
  }

  private async turnoAtual(): Promise<number> {
    const season = await this.prisma.season.findFirst({ orderBy: { ano: 'desc' } });
    return season?.turnoAtual ?? 1;
  }

  private async assertMember(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Você não é membro deste grupo.');
    }
  }
}
