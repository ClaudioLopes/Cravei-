import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AuthService', () => {
  let authService: AuthService;
  let prisma: { user: { findUnique: jest.Mock; create: jest.Mock } };
  let jwtService: { sign: jest.Mock; verify: jest.Mock };

  const usuarioExistente = {
    id: 'user-1',
    nome: 'Fulano',
    email: 'fulano@bolao.com',
    senhaHash: bcrypt.hashSync('senha-correta', 10),
    foto: null,
    criadoEm: new Date('2026-01-01'),
  };

  beforeEach(() => {
    prisma = { user: { findUnique: jest.fn(), create: jest.fn() } };
    jwtService = { sign: jest.fn().mockReturnValue('token-fake'), verify: jest.fn() };
    authService = new AuthService(
      prisma as unknown as PrismaService,
      jwtService as unknown as JwtService,
    );
  });

  describe('register', () => {
    it('cria o usuário com senha em hash e retorna tokens', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      prisma.user.create.mockResolvedValue({
        id: 'user-novo',
        nome: 'Novo',
        email: 'novo@bolao.com',
        senhaHash: 'hash-qualquer',
        foto: null,
        criadoEm: new Date('2026-01-01'),
      });

      const result = await authService.register({
        nome: 'Novo',
        email: 'novo@bolao.com',
        senha: 'senha123',
      });

      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const dadosGravados = prisma.user.create.mock.calls[0][0].data;
      expect(dadosGravados.senhaHash).not.toBe('senha123');
      expect(await bcrypt.compare('senha123', dadosGravados.senhaHash)).toBe(true);

      expect(result.user.email).toBe('novo@bolao.com');
      expect(result.accessToken).toBe('token-fake');
      expect(result.refreshToken).toBe('token-fake');
      expect((result.user as any).senhaHash).toBeUndefined();
    });

    it('rejeita cadastro com email já existente', async () => {
      prisma.user.findUnique.mockResolvedValue(usuarioExistente);

      await expect(
        authService.register({ nome: 'X', email: usuarioExistente.email, senha: 'senha123' }),
      ).rejects.toThrow(ConflictException);
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('autentica com email e senha corretos', async () => {
      prisma.user.findUnique.mockResolvedValue(usuarioExistente);

      const result = await authService.login({
        email: usuarioExistente.email,
        senha: 'senha-correta',
      });

      expect(result.user.id).toBe(usuarioExistente.id);
      expect(result.accessToken).toBe('token-fake');
    });

    it('rejeita quando o email não existe', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'ninguem@bolao.com', senha: 'qualquer' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita quando a senha está incorreta', async () => {
      prisma.user.findUnique.mockResolvedValue(usuarioExistente);

      await expect(
        authService.login({ email: usuarioExistente.email, senha: 'senha-errada' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refresh', () => {
    it('gera novos tokens quando o refresh token é válido', async () => {
      jwtService.verify.mockReturnValue({ sub: usuarioExistente.id, email: usuarioExistente.email });
      prisma.user.findUnique.mockResolvedValue(usuarioExistente);

      const result = await authService.refresh('refresh-valido');

      expect(result.accessToken).toBe('token-fake');
      expect(result.refreshToken).toBe('token-fake');
    });

    it('rejeita refresh token inválido ou expirado', async () => {
      jwtService.verify.mockImplementation(() => {
        throw new Error('jwt expired');
      });

      await expect(authService.refresh('refresh-invalido')).rejects.toThrow(UnauthorizedException);
    });

    it('rejeita quando o usuário do token não existe mais', async () => {
      jwtService.verify.mockReturnValue({ sub: 'user-apagado', email: 'x@x.com' });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(authService.refresh('refresh-valido')).rejects.toThrow(UnauthorizedException);
    });
  });
});
