import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { GroupsModule } from './groups/groups.module';
import { RoundsModule } from './rounds/rounds.module';
import { FixturesModule } from './fixtures/fixtures.module';
import { PredictionsModule } from './predictions/predictions.module';
import { ScoringModule } from './scoring/scoring.module';
import { StandingsModule } from './standings/standings.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    UsersModule,
    GroupsModule,
    RoundsModule,
    ScoringModule,
    StandingsModule,
    FixturesModule,
    PredictionsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
