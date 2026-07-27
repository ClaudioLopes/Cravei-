import { IsInt, IsUUID, Min } from 'class-validator';

export class CreatePredictionDto {
  @IsUUID()
  matchId: string;

  @IsInt()
  @Min(0)
  placarCasaPalpite: number;

  @IsInt()
  @Min(0)
  placarForaPalpite: number;
}
