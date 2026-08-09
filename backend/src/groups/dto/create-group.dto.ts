import { Type } from 'class-transformer';
import {
  IsIn,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ScoringConfigDto } from './scoring-config.dto';

export class CreateGroupDto {
  @IsString()
  @MinLength(3)
  nome: string;

  @IsOptional()
  @IsIn(['PUBLICO', 'PRIVADO'])
  tipo?: 'PUBLICO' | 'PRIVADO';

  @IsOptional()
  @ValidateNested()
  @Type(() => ScoringConfigDto)
  scoringConfig?: ScoringConfigDto;

  // 1 = só reconhece o líder como campeão do turno; 3 = pódio (1º, 2º e 3º)
  @IsOptional()
  @IsIn([1, 3])
  podioTamanho?: number;
}
