import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TurnoService {
  private readonly logger = new Logger(TurnoService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Chamado quando a última rodada de um turno (19 ou 38) fica com todos os jogos encerrados.
  // Apura o(s) campeão(ões) do turno por grupo — 1 colocado ou pódio (1º/2º/3º), conforme
  // Group.podioTamanho. Idempotente: não recria TurnoWinner já existente.
  async tryCloseTurno(_seasonId: string, turno: number): Promise<void> {
    const groupsComStandings = await this.prisma.standing.findMany({
      where: { turno },
      distinct: ['groupId'],
      select: { groupId: true },
    });

    for (const { groupId } of groupsComStandings) {
      const jaDefinido = await this.prisma.turnoWinner.findFirst({
        where: { groupId, turno },
      });
      if (jaDefinido) continue;

      const group = await this.prisma.group.findUnique({
        where: { id: groupId },
        select: { podioTamanho: true },
      });
      const podioTamanho = group?.podioTamanho ?? 1;

      const colocados = await this.prisma.standing.findMany({
        where: { groupId, turno },
        orderBy: { pontosTotais: 'desc' },
        take: podioTamanho,
      });
      if (colocados.length === 0) continue;

      await this.prisma.turnoWinner.createMany({
        data: colocados.map((standing, index) => ({
          groupId,
          turno,
          posicao: index + 1,
          userId: standing.userId,
          pontosFinais: standing.pontosTotais,
        })),
      });
      this.logger.log(
        `Turno ${turno} fechado para o grupo ${groupId}: ${colocados.length} colocado(s) registrado(s).`,
      );
    }
  }
}
