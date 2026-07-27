import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './types/jwt-payload.type';

interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Já existe uma conta com este email.');
    }

    const senhaHash = await bcrypt.hash(dto.senha, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: { nome: dto.nome, email: dto.email, senhaHash },
    });

    return { user: this.toPublicUser(user), ...this.generateTokens(user) };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    const senhaValida = await bcrypt.compare(dto.senha, user.senhaHash);
    if (!senhaValida) {
      throw new UnauthorizedException('Email ou senha inválidos.');
    }

    return { user: this.toPublicUser(user), ...this.generateTokens(user) };
  }

  async refresh(refreshToken: string) {
    let payload: JwtPayload;
    try {
      payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
    } catch {
      throw new UnauthorizedException('Refresh token inválido ou expirado.');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado.');
    }

    return this.generateTokens(user);
  }

  private generateTokens(user: { id: string; email: string }): AuthTokens {
    const payload: JwtPayload = { sub: user.id, email: user.email };

    const accessToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',
    });

    return { accessToken, refreshToken };
  }

  private toPublicUser(user: {
    id: string;
    nome: string;
    email: string;
    foto: string | null;
    criadoEm: Date;
  }) {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      foto: user.foto,
      criadoEm: user.criadoEm,
    };
  }
}
