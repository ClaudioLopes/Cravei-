import { Module } from '@nestjs/common';
import { FixturesModule } from '../fixtures/fixtures.module';
import { RoundsService } from './rounds.service';
import { RoundsController } from './rounds.controller';

@Module({
  imports: [FixturesModule],
  controllers: [RoundsController],
  providers: [RoundsService],
  exports: [RoundsService],
})
export class RoundsModule {}
