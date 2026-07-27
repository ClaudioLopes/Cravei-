import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RoundsService } from './rounds.service';

@Controller('rounds')
@UseGuards(JwtAuthGuard)
export class RoundsController {
  constructor(private readonly roundsService: RoundsService) {}

  @Get('current')
  getCurrent() {
    return this.roundsService.getCurrent();
  }

  @Get('numero/:numero')
  getByNumber(@Param('numero', ParseIntPipe) numero: number) {
    return this.roundsService.getByNumber(numero);
  }

  @Get(':id/matches')
  getMatches(@Param('id') id: string) {
    return this.roundsService.getMatches(id);
  }
}
