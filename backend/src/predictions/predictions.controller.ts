import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { PredictionsService } from './predictions.service';
import { CreatePredictionDto } from './dto/create-prediction.dto';

@Controller('predictions')
@UseGuards(JwtAuthGuard)
export class PredictionsController {
  constructor(private readonly predictionsService: PredictionsService) {}

  @Post()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreatePredictionDto,
  ) {
    return this.predictionsService.upsert(user.id, dto);
  }

  @Get('me/:roundId')
  getMine(
    @CurrentUser() user: AuthenticatedUser,
    @Param('roundId') roundId: string,
  ) {
    return this.predictionsService.getMine(user.id, roundId);
  }

  @Get('match/:matchId')
  getForMatch(
    @CurrentUser() user: AuthenticatedUser,
    @Param('matchId') matchId: string,
  ) {
    return this.predictionsService.getForMatch(user.id, matchId);
  }
}
