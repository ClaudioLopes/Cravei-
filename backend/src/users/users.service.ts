import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuário não encontrado.');
    }
    return this.toPublicUser(user);
  }

  async updateProfile(id: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.toPublicUser(user);
  }

  async updatePushToken(id: string, pushToken: string) {
    await this.prisma.user.update({ where: { id }, data: { pushToken } });
    return { ok: true };
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
