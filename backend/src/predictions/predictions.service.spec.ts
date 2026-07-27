import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PredictionsService } from './predictions.service';
import { PrismaService } from '../prisma/prisma.service';

function criarPrismaMock() {
  return {
    match: { findUnique: jest.fn() },
    prediction: { findUnique: jest.fn(), findMany: jest.fn(), upsert: jest.fn() },
    groupMember: { findMany: jest.fn() },
    groupTurnoLock: { findUnique: jest.fn(), create: jest.fn() },
  };
}

describe('PredictionsService', () => {
  let service: PredictionsService;
  let prisma: ReturnType<typeof criarPrismaMock>;

  const agora = new Date('2026-08-01T12:00:00Z');

  beforeEach(() => {
    prisma = criarPrismaMock();
    service = new PredictionsService(prisma as unknown as PrismaService);
    jest.useFakeTimers().setSystemTime(agora);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('upsert — regra 5.1 (prazo)', () => {
    const dto = { matchId: 'match-1', placarCasaPalpite: 2, placarForaPalpite: 1 };

    it('lança NotFoundException se o jogo não existe', async () => {
      prisma.match.findUnique.mockResolvedValue(null);

      await expect(service.upsert('user-1', dto)).rejects.toThrow(NotFoundException);
    });

    it('bloqueia o palpite quando o prazo da rodada já passou (sem reagendamento)', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'match-1',
        prazoIndividual: null,
        round: { turno: 1, primeiroJogoOriginal: new Date('2026-08-01T11:00:00Z') },
      });

      await expect(service.upsert('user-1', dto)).rejects.toThrow(ForbiddenException);
      expect(prisma.prediction.upsert).not.toHaveBeenCalled();
    });

    it('bloqueia o palpite quando o jogo foi remarcado e o prazo individual já passou', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'match-1',
        prazoIndividual: new Date('2026-08-01T10:00:00Z'),
        round: { turno: 1, primeiroJogoOriginal: new Date('2026-09-01T00:00:00Z') },
      });

      await expect(service.upsert('user-1', dto)).rejects.toThrow(ForbiddenException);
    });

    it('permite o palpite quando o prazo individual (jogo remarcado) ainda não passou, mesmo com a rodada já travada', async () => {
      prisma.match.findUnique.mockResolvedValue({
        id: 'match-1',
        prazoIndividual: new Date('2026-08-01T13:00:00Z'),
        round: { turno: 1, primeiroJogoOriginal: new Date('2026-01-01T00:00:00Z') },
      });
      prisma.prediction.findUnique.mockResolvedValue(null);
      prisma.prediction.upsert.mockResolvedValue({ id: 'pred-1' });
      prisma.groupMember.findMany.mockResolvedValue([]);

      await expect(service.upsert('user-1', dto)).resolves.toEqual({ id: 'pred-1' });
    });
  });

  describe('upsert — regra 5.2 (trava de pontuação no primeiro palpite do turno)', () => {
    const dto = { matchId: 'match-1', placarCasaPalpite: 1, placarForaPalpite: 0 };
    const matchNoPrazo = {
      id: 'match-1',
      prazoIndividual: null,
      round: { turno: 1, primeiroJogoOriginal: new Date('2026-12-31T00:00:00Z') },
    };

    it('trava a regra dos grupos do usuário no primeiro palpite (grupo ainda não travado)', async () => {
      prisma.match.findUnique.mockResolvedValue(matchNoPrazo);
      prisma.prediction.findUnique.mockResolvedValue(null); // é a primeira vez
      prisma.prediction.upsert.mockResolvedValue({ id: 'pred-1' });
      prisma.groupMember.findMany.mockResolvedValue([{ groupId: 'grupo-a' }, { groupId: 'grupo-b' }]);
      prisma.groupTurnoLock.findUnique.mockResolvedValue(null);

      await service.upsert('user-1', dto);

      expect(prisma.groupTurnoLock.create).toHaveBeenCalledTimes(2);
      expect(prisma.groupTurnoLock.create).toHaveBeenCalledWith({
        data: { groupId: 'grupo-a', turno: 1 },
      });
      expect(prisma.groupTurnoLock.create).toHaveBeenCalledWith({
        data: { groupId: 'grupo-b', turno: 1 },
      });
    });

    it('não trava de novo um grupo cujo turno já está travado', async () => {
      prisma.match.findUnique.mockResolvedValue(matchNoPrazo);
      prisma.prediction.findUnique.mockResolvedValue(null);
      prisma.prediction.upsert.mockResolvedValue({ id: 'pred-1' });
      prisma.groupMember.findMany.mockResolvedValue([{ groupId: 'grupo-a' }]);
      prisma.groupTurnoLock.findUnique.mockResolvedValue({ id: 'lock-existente' });

      await service.upsert('user-1', dto);

      expect(prisma.groupTurnoLock.create).not.toHaveBeenCalled();
    });

    it('não mexe na trava ao editar um palpite já existente', async () => {
      prisma.match.findUnique.mockResolvedValue(matchNoPrazo);
      prisma.prediction.findUnique.mockResolvedValue({ id: 'pred-1' }); // já existia
      prisma.prediction.upsert.mockResolvedValue({ id: 'pred-1' });

      await service.upsert('user-1', dto);

      expect(prisma.groupMember.findMany).not.toHaveBeenCalled();
      expect(prisma.groupTurnoLock.create).not.toHaveBeenCalled();
    });
  });

  describe('getForMatch — regra 5.4 (visibilidade só após o início do jogo)', () => {
    it('antes do jogo começar, só mostra o próprio palpite do usuário', async () => {
      prisma.match.findUnique.mockResolvedValue({ id: 'match-1', status: 'AGENDADO' });
      prisma.prediction.findUnique.mockResolvedValue({ id: 'pred-do-usuario' });

      const result = await service.getForMatch('user-1', 'match-1');

      expect(result).toEqual([{ id: 'pred-do-usuario' }]);
      expect(prisma.prediction.findMany).not.toHaveBeenCalled();
    });

    it('antes do jogo começar, retorna lista vazia se o usuário não palpitou', async () => {
      prisma.match.findUnique.mockResolvedValue({ id: 'match-1', status: 'ADIADO' });
      prisma.prediction.findUnique.mockResolvedValue(null);

      const result = await service.getForMatch('user-1', 'match-1');

      expect(result).toEqual([]);
    });

    it('depois que o jogo começa, mostra os palpites de todo mundo', async () => {
      prisma.match.findUnique.mockResolvedValue({ id: 'match-1', status: 'EM_ANDAMENTO' });
      prisma.prediction.findMany.mockResolvedValue([{ id: 'pred-1' }, { id: 'pred-2' }]);

      const result = await service.getForMatch('user-1', 'match-1');

      expect(result).toHaveLength(2);
      expect(prisma.prediction.findUnique).not.toHaveBeenCalled();
    });

    it('lança NotFoundException se o jogo não existe', async () => {
      prisma.match.findUnique.mockResolvedValue(null);

      await expect(service.getForMatch('user-1', 'match-inexistente')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
