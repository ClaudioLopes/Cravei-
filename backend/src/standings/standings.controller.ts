import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { StandingsService } from './standings.service';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class StandingsController {
  constructor(private readonly standingsService: StandingsService) {}

  @Get(':id/standings')
  getStandings(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') groupId: string,
    @Query('turno') turno?: string,
  ) {
    return this.standingsService.getStandings(
      user.id,
      groupId,
      turno ? Number(turno) : undefined,
    );
  }

  @Get(':id/standings/history')
  getHistory(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') groupId: string,
  ) {
    return this.standingsService.getHistory(user.id, groupId);
  }

  @Get(':id/turno-winner/:turno')
  getTurnoWinner(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') groupId: string,
    @Param('turno', ParseIntPipe) turno: number,
  ) {
    return this.standingsService.getTurnoWinner(user.id, groupId, turno);
  }
}
