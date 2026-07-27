import { Module } from '@nestjs/common';
import { StandingsService } from './standings.service';
import { StandingsController } from './standings.controller';
import { TurnoService } from './turno.service';

@Module({
  controllers: [StandingsController],
  providers: [StandingsService, TurnoService],
  exports: [StandingsService, TurnoService],
})
export class StandingsModule {}
