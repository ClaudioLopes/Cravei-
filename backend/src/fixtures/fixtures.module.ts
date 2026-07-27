import { Module } from '@nestjs/common';
import { ScoringModule } from '../scoring/scoring.module';
import { StandingsModule } from '../standings/standings.module';
import { FixturesSyncService } from './fixtures-sync.service';
import { FootballDataProvider } from './football-data.provider';
import { FIXTURES_PROVIDER } from './fixtures-provider.interface';

@Module({
  imports: [ScoringModule, StandingsModule],
  providers: [
    FixturesSyncService,
    FootballDataProvider,
    { provide: FIXTURES_PROVIDER, useClass: FootballDataProvider },
  ],
  exports: [FixturesSyncService],
})
export class FixturesModule {}
