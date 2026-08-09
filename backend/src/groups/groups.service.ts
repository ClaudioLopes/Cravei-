import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { ScoringConfigDto } from './dto/scoring-config.dto';

const DEFAULT_SCORING_CONFIG: ScoringConfigDto = { tipo: 'placar_exato' };

@Injectable()
export class GroupsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGroupDto) {
    const codigoConvite = await this.generateUniqueInviteCode();

    const group = await this.prisma.group.create({
      data: {
        nome: dto.nome,
        tipo: dto.tipo ?? 'PRIVADO',
        codigoConvite,
        donoId: userId,
        scoringConfig: (dto.scoringConfig ??
          DEFAULT_SCORING_CONFIG) as unknown as Prisma.InputJsonValue,
        podioTamanho: dto.podioTamanho ?? 1,
        members: {
          create: { userId, papel: 'ADMIN' },
        },
      },
      include: { members: true },
    });

    return group;
  }

  // resolve um grupo a partir do código de convite (usado pela tela "Entrar em grupo", que só tem o código)
  async findByCode(codigoConvite: string) {
    const group = await this.prisma.group.findUnique({
      where: { codigoConvite },
    });
    if (!group) {
      throw new NotFoundException('Código de convite inválido.');
    }
    return group;
  }

  async join(userId: string, groupId: string, codigoConvite: string) {
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group || group.codigoConvite !== codigoConvite) {
      throw new NotFoundException('Código de convite inválido.');
    }

    const jaMembro = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId: group.id, userId } },
    });
    if (jaMembro) {
      return group;
    }

    await this.prisma.groupMember.create({
      data: { groupId: group.id, userId, papel: 'MEMBRO' },
    });

    return group;
  }

  async findMine(userId: string) {
    const memberships = await this.prisma.groupMember.findMany({
      where: { userId },
      include: { group: true },
      orderBy: { entrouEm: 'desc' },
    });
    return memberships.map((m) => ({ ...m.group, meuPapel: m.papel }));
  }

  async findById(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const group = await this.prisma.group.findUnique({
      where: { id: groupId },
    });
    if (!group) {
      throw new NotFoundException('Grupo não encontrado.');
    }
    return group;
  }

  async members(userId: string, groupId: string) {
    await this.assertMember(userId, groupId);
    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, nome: true, foto: true } } },
      orderBy: { entrouEm: 'asc' },
    });
    return members;
  }

  async updateScoringRule(
    userId: string,
    groupId: string,
    dto: ScoringConfigDto,
  ) {
    await this.assertAdmin(userId, groupId);

    const season = await this.prisma.season.findFirst({
      orderBy: { ano: 'desc' },
    });
    const turnoAtual = season?.turnoAtual ?? 1;

    const lock = await this.prisma.groupTurnoLock.findUnique({
      where: { groupId_turno: { groupId, turno: turnoAtual } },
    });
    if (lock) {
      throw new ConflictException(
        'A regra de pontuação já está travada para o turno atual (o primeiro palpite do turno já foi enviado).',
      );
    }

    return this.prisma.group.update({
      where: { id: groupId },
      data: { scoringConfig: dto as unknown as Prisma.InputJsonValue },
    });
  }

  // usado pela tela de detalhe do grupo (seção 7, item 3): "status dos palpites dos membros" —
  // mostra apenas se cada membro completou ou não, nunca os palpites em si (regra 5.4)
  async predictionsStatus(userId: string, groupId: string, roundId: string) {
    await this.assertMember(userId, groupId);

    const matches = await this.prisma.match.findMany({
      where: { roundId },
      select: { id: true },
    });
    const matchIds = matches.map((m) => m.id);

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: { user: { select: { id: true, nome: true, foto: true } } },
    });

    return Promise.all(
      members.map(async (member) => {
        const enviados = matchIds.length
          ? await this.prisma.prediction.count({
              where: { userId: member.userId, matchId: { in: matchIds } },
            })
          : 0;
        return {
          user: member.user,
          enviados,
          total: matchIds.length,
          completo: matchIds.length > 0 && enviados === matchIds.length,
        };
      }),
    );
  }

  private async assertMember(userId: string, groupId: string) {
    const membership = await this.prisma.groupMember.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) {
      throw new ForbiddenException('Você não é membro deste grupo.');
    }
    return membership;
  }

  private async assertAdmin(userId: string, groupId: string) {
    const membership = await this.assertMember(userId, groupId);
    if (membership.papel !== 'ADMIN') {
      throw new ForbiddenException(
        'Apenas administradores do grupo podem executar esta ação.',
      );
    }
    return membership;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let tentativa = 0; tentativa < 5; tentativa++) {
      const codigo = randomBytes(4).toString('hex').toUpperCase();
      const existente = await this.prisma.group.findUnique({
        where: { codigoConvite: codigo },
      });
      if (!existente) {
        return codigo;
      }
    }
    throw new ConflictException(
      'Não foi possível gerar um código de convite único, tente novamente.',
    );
  }
}
