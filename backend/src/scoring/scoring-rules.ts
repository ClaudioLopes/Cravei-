import { ScoringConfigDto } from '../groups/dto/scoring-config.dto';

export interface MatchResult {
  placarCasa: number;
  placarFora: number;
}

export interface PredictionGuess {
  placarCasaPalpite: number;
  placarForaPalpite: number;
}

// Sem padrão fixo do sistema para "camadas" (ponto em aberto #1 do documento — livre para o admin);
// usados apenas como sugestão de preenchimento no formulário do app e como fallback caso não informado.
export const PONTOS_PLACAR_EXATO_UNICO = 1; // modo "placar_exato": só pontua o acerto exato, vale 1
export const PONTOS_CAMADAS_PLACAR_EXATO_PADRAO = 3; // modo "camadas": acerto exato vale mais que o resultado
export const PONTOS_RESULTADO_PADRAO = 1;

type Resultado = 'CASA' | 'FORA' | 'EMPATE';

function resultadoDoJogo(casa: number, fora: number): Resultado {
  if (casa > fora) return 'CASA';
  if (casa < fora) return 'FORA';
  return 'EMPATE';
}

export function calcularPontos(
  guess: PredictionGuess,
  result: MatchResult,
  config: ScoringConfigDto,
): number {
  const acertouExato =
    guess.placarCasaPalpite === result.placarCasa &&
    guess.placarForaPalpite === result.placarFora;
  const acertouResultado =
    resultadoDoJogo(guess.placarCasaPalpite, guess.placarForaPalpite) ===
    resultadoDoJogo(result.placarCasa, result.placarFora);

  switch (config.tipo) {
    case 'placar_exato':
      return acertouExato ? PONTOS_PLACAR_EXATO_UNICO : 0;
    case 'resultado_simples':
      return acertouResultado ? PONTOS_RESULTADO_PADRAO : 0;
    case 'camadas':
      if (acertouExato) {
        return config.pontosPlacarExato ?? PONTOS_CAMADAS_PLACAR_EXATO_PADRAO;
      }
      if (acertouResultado) {
        return config.pontosResultado ?? PONTOS_RESULTADO_PADRAO;
      }
      return 0;
    default:
      return 0;
  }
}
