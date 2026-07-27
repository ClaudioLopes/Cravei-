import { IsIn, IsInt, IsOptional, Min } from 'class-validator';

export const SCORING_TYPES = [
  'placar_exato',
  'resultado_simples',
  'camadas',
] as const;

export type ScoringType = (typeof SCORING_TYPES)[number];

export class ScoringConfigDto {
  @IsIn(SCORING_TYPES)
  tipo: ScoringType;

  // usados apenas quando tipo === 'camadas'; livre para o admin definir (sem padrão fixo do sistema)
  @IsOptional()
  @IsInt()
  @Min(1)
  pontosPlacarExato?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  pontosResultado?: number;
}
