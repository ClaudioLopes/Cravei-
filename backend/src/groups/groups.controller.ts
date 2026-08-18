import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/types/jwt-payload.type';
import { GroupsService } from './groups.service';
import { CreateGroupDto } from './dto/create-group.dto';
import { UpdateGroupDto } from './dto/update-group.dto';
import { JoinGroupDto } from './dto/join-group.dto';
import { ScoringConfigDto } from './dto/scoring-config.dto';

@Controller('groups')
@UseGuards(JwtAuthGuard)
export class GroupsController {
  constructor(private readonly groupsService: GroupsService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateGroupDto) {
    return this.groupsService.create(user.id, dto);
  }

  @Get('me')
  findMine(@CurrentUser() user: AuthenticatedUser) {
    return this.groupsService.findMine(user.id);
  }

  @Get('by-code/:codigo')
  findByCode(@Param('codigo') codigo: string) {
    return this.groupsService.findByCode(codigo);
  }

  @Post(':id/join')
  join(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: JoinGroupDto,
  ) {
    return this.groupsService.join(user.id, id, dto.codigoConvite);
  }

  @Get(':id')
  findById(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.groupsService.findById(user.id, id);
  }

  @Get(':id/members')
  members(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groupsService.members(user.id, id);
  }

  @Get(':id/rounds/:roundId/predictions-status')
  predictionsStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Param('roundId') roundId: string,
  ) {
    return this.groupsService.predictionsStatus(user.id, id, roundId);
  }

  @Patch(':id/scoring-rule')
  updateScoringRule(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ScoringConfigDto,
  ) {
    return this.groupsService.updateScoringRule(user.id, id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.groupsService.update(user.id, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.groupsService.remove(user.id, id);
  }
}
