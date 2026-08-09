import {
  calcularPontos,
  PONTOS_PLACAR_EXATO_UNICO,
  PONTOS_CAMADAS_PLACAR_EXATO_PADRAO,
  PONTOS_RESULTADO_PADRAO,
} from './scoring-rules';

describe('calcularPontos', () => {
  const resultado = { placarCasa: 2, placarFora: 1 };

  describe('regra "placar_exato"', () => {
    const config = { tipo: 'placar_exato' as const };

    it('pontua o padrão quando acerta o placar exato', () => {
      const pontos = calcularPontos(
        { placarCasaPalpite: 2, placarForaPalpite: 1 },
        resultado,
        config,
      );
      expect(pontos).toBe(PONTOS_PLACAR_EXATO_UNICO);
    });

    it('não pontua quando acerta só o vencedor, sem o placar', () => {
      const pontos = calcularPontos(
        { placarCasaPalpite: 3, placarForaPalpite: 0 },
        resultado,
        config,
      );
      expect(pontos).toBe(0);
    });

    it('não pontua quando erra tudo', () => {
      const pontos = calcularPontos(
        { placarCasaPalpite: 0, placarForaPalpite: 2 },
        resultado,
        config,
      );
      expect(pontos).toBe(0);
    });
  });

  describe('regra "resultado_simples"', () => {
    const config = { tipo: 'resultado_simples' as const };

    it('pontua o padrão quando acerta só o vencedor (sem bater o placar)', () => {
      const pontos = calcularPontos(
        { placarCasaPalpite: 3, placarForaPalpite: 0 },
        resultado,
        config,
      );
      expect(pontos).toBe(PONTOS_RESULTADO_PADRAO);
    });

    it('também pontua quando acerta o placar exato (implica o resultado)', () => {
      const pontos = calcularPontos(
        { placarCasaPalpite: 2, placarForaPalpite: 1 },
        resultado,
        config,
      );
      expect(pontos).toBe(PONTOS_RESULTADO_PADRAO);
    });

    it('não pontua quando erra o vencedor', () => {
      const pontos = calcularPontos(
        { placarCasaPalpite: 1, placarForaPalpite: 1 },
        resultado,
        config,
      );
      expect(pontos).toBe(0);
    });

    it('trata empate corretamente', () => {
      const empate = { placarCasa: 1, placarFora: 1 };
      const pontos = calcularPontos(
        { placarCasaPalpite: 0, placarForaPalpite: 0 },
        empate,
        config,
      );
      expect(pontos).toBe(PONTOS_RESULTADO_PADRAO);
    });
  });

  describe('regra "camadas"', () => {
    it('usa os pontos configurados pelo admin para placar exato', () => {
      const config = { tipo: 'camadas' as const, pontosPlacarExato: 5, pontosResultado: 2 };
      const pontos = calcularPontos(
        { placarCasaPalpite: 2, placarForaPalpite: 1 },
        resultado,
        config,
      );
      expect(pontos).toBe(5);
    });

    it('usa os pontos configurados pelo admin para acerto de resultado', () => {
      const config = { tipo: 'camadas' as const, pontosPlacarExato: 5, pontosResultado: 2 };
      const pontos = calcularPontos(
        { placarCasaPalpite: 4, placarForaPalpite: 0 },
        resultado,
        config,
      );
      expect(pontos).toBe(2);
    });

    it('cai no padrão (3/1) quando o admin não configurou valores', () => {
      const config = { tipo: 'camadas' as const };
      expect(
        calcularPontos({ placarCasaPalpite: 2, placarForaPalpite: 1 }, resultado, config),
      ).toBe(PONTOS_CAMADAS_PLACAR_EXATO_PADRAO);
      expect(
        calcularPontos({ placarCasaPalpite: 4, placarForaPalpite: 0 }, resultado, config),
      ).toBe(PONTOS_RESULTADO_PADRAO);
    });

    it('não pontua quando erra o vencedor', () => {
      const config = { tipo: 'camadas' as const, pontosPlacarExato: 5, pontosResultado: 2 };
      const pontos = calcularPontos(
        { placarCasaPalpite: 0, placarForaPalpite: 3 },
        resultado,
        config,
      );
      expect(pontos).toBe(0);
    });
  });
});
