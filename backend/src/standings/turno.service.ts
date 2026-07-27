import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TurnoService {
  private readonly logger = new Logger(TurnoService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Chamado quando a última rodada de um turno (19 ou 38) fica com todos os jogos encerrados.
  // Apura o campeão do turno por grupo. Idempotente: não recria TurnoWinner já existente.
  async tryCloseTurno(_seasonId: string, turno: number): Promise<void> {
    const groupsComStandings = await this.prisma.standing.findMany({
      where: { turno },
      distinct: ['groupId'],
      select: { groupId: true },
    });

    for (const { groupId } of groupsComStandings) {
      const jaDefinido = await this.prisma.turnoWinner.findUnique({
        where: { groupId_turno: { groupId, turno } },
      });
      if (jaDefinido) continue;

      const lider = await this.prisma.standing.findFirst({
        where: { groupId, turno },
        orderBy: { pontosTotais: 'desc' },
      });
      if (!lider) continue;

      await this.prisma.turnoWinner.create({
        data: {
          groupId,
          turno,
          userId: lider.userId,
          pontosFinais: lider.pontosTotais,
        },
      });
      this.logger.log(
        `Campeão do turno ${turno} definido para o grupo ${groupId}: usuário ${lider.userId}.`,
      );
    }
  }
}
