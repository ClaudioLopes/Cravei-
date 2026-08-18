import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getRoundByNumber } from '../../../../../src/api/rounds';
import { getMyPredictions } from '../../../../../src/api/predictions';
import { getGroup } from '../../../../../src/api/groups';
import { Card, EmptyState, Screen, Subtitle, Title } from '../../../../../src/components/ui';
import { colors } from '../../../../../src/theme/colors';
import { formatDateTime } from '../../../../../src/lib/deadline';
import { Match, Prediction, ScoringConfig } from '../../../../../src/types/api';
import { TeamCrest } from '../../../../../src/components/team-crest';

const STATUS_LABEL: Record<Match['status'], string> = {
  AGENDADO: 'Agendado',
  ADIADO: 'Adiado',
  EM_ANDAMENTO: 'Em andamento',
  ENCERRADO: 'Encerrado',
};

type Resultado = 'CASA' | 'FORA' | 'EMPATE';

function resultadoDoJogo(casa: number, fora: number): Resultado {
  if (casa > fora) return 'CASA';
  if (casa < fora) return 'FORA';
  return 'EMPATE';
}

// Espelha backend/src/scoring/scoring-rules.ts (calcularPontos) — mesmos valores padrão e mesma
// regra por tipo, para que a avaliação exibida aqui nunca desacompanhe o que o grupo realmente pontua.
const PONTOS_PLACAR_EXATO_UNICO = 1;
const PONTOS_CAMADAS_PLACAR_EXATO_PADRAO = 3;
const PONTOS_RESULTADO_PADRAO = 1;

function pontosDoPalpite(pred: Prediction, match: Match, config: ScoringConfig): number {
  const acertouExato =
    pred.placarCasaPalpite === match.placarCasa && pred.placarForaPalpite === match.placarFora;
  const acertouResultado =
    resultadoDoJogo(pred.placarCasaPalpite, pred.placarForaPalpite) ===
    resultadoDoJogo(match.placarCasa!, match.placarFora!);

  switch (config.tipo) {
    case 'placar_exato':
      return acertouExato ? PONTOS_PLACAR_EXATO_UNICO : 0;
    case 'resultado_simples':
      return acertouResultado ? PONTOS_RESULTADO_PADRAO : 0;
    case 'camadas':
      if (acertouExato) return config.pontosPlacarExato ?? PONTOS_CAMADAS_PLACAR_EXATO_PADRAO;
      if (acertouResultado) return config.pontosResultado ?? PONTOS_RESULTADO_PADRAO;
      return 0;
    default:
      return 0;
  }
}

// Retorna null enquanto não dá pra avaliar (jogo não encerrado, ou regra do grupo ainda não carregou) —
// evita mostrar um rótulo genérico incorreto antes da regra do grupo estar disponível.
function avaliarPalpite(
  pred: Prediction,
  match: Match,
  config?: ScoringConfig,
): 'exato' | 'resultado' | 'errou' | null {
  if (!config) return null;
  if (match.status !== 'ENCERRADO') return null;
  if (match.placarCasa === null || match.placarFora === null) return null;

  const pontos = pontosDoPalpite(pred, match, config);
  if (pontos <= 0) return 'errou';

  const acertouExato =
    pred.placarCasaPalpite === match.placarCasa && pred.placarForaPalpite === match.placarFora;
  return acertouExato ? 'exato' : 'resultado';
}

const AVALIACAO_LABEL: Record<'exato' | 'resultado' | 'errou', { texto: string; cor: string }> = {
  exato: { texto: '✓ Placar exato', cor: colors.accent },
  resultado: { texto: '✓ Acertou o resultado', cor: colors.accentAlt },
  errou: { texto: '✗ Errou', cor: colors.danger },
};

export default function RoundByNumberScreen() {
  const { groupId, numero } = useLocalSearchParams<{ groupId: string; numero: string }>();
  const numeroAtual = Number(numero);

  const { data: round, isLoading, error } = useQuery({
    queryKey: ['round', 'numero', numeroAtual],
    queryFn: () => getRoundByNumber(numeroAtual),
    enabled: Number.isInteger(numeroAtual) && numeroAtual > 0,
    retry: false,
  });

  const { data: minhasPredicoes } = useQuery({
    queryKey: ['predictions', 'me', round?.id],
    queryFn: () => getMyPredictions(round!.id),
    enabled: !!round?.id,
  });

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
  });

  function irPara(novaRodada: number) {
    if (novaRodada < 1) return;
    router.replace(`/(app)/groups/${groupId}/round/${novaRodada}`);
  }

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: `Rodada ${numeroAtual}` }} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable
          onPress={() => irPara(numeroAtual - 1)}
          disabled={numeroAtual <= 1}
          style={{ opacity: numeroAtual <= 1 ? 0.3 : 1 }}
        >
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Title>Rodada {numeroAtual}</Title>
        <Pressable onPress={() => irPara(numeroAtual + 1)}>
          <Text style={{ color: colors.accent, fontSize: 24 }}>›</Text>
        </Pressable>
      </View>

      {isLoading && <Subtitle>Carregando…</Subtitle>}

      {!!error && (
        <EmptyState message="Não foi possível encontrar essa rodada. Tente outro número." />
      )}

      <FlatList
        data={round?.matches ?? []}
        keyExtractor={(m: Match) => m.id}
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        renderItem={({ item }: { item: Match }) => {
          const meuPalpite = minhasPredicoes?.find((p: Prediction) => p.matchId === item.id);
          const avaliacao = meuPalpite ? avaliarPalpite(meuPalpite, item, group?.scoringConfig) : null;

          return (
            <Card>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {formatDateTime(item.dataHoraPrevista)} · {STATUS_LABEL[item.status]}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ flex: 1, color: colors.text, fontSize: 15, textAlign: 'right' }}>
                  {item.timeCasa}
                </Text>
                <TeamCrest uri={item.crestCasa} />
                <Text style={{ color: colors.accentAlt, fontSize: 18, fontWeight: '700' }}>
                  {item.status === 'ENCERRADO' || item.status === 'EM_ANDAMENTO'
                    ? `${item.placarCasa ?? 0} x ${item.placarFora ?? 0}`
                    : 'x'}
                </Text>
                <TeamCrest uri={item.crestFora} />
                <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{item.timeFora}</Text>
              </View>

              {meuPalpite ? (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                    Seu palpite: {meuPalpite.placarCasaPalpite} x {meuPalpite.placarForaPalpite}
                  </Text>
                  {avaliacao && (
                    <Text style={{ color: AVALIACAO_LABEL[avaliacao].cor, fontSize: 13, fontWeight: '600' }}>
                      {AVALIACAO_LABEL[avaliacao].texto}
                    </Text>
                  )}
                </View>
              ) : (
                <Text style={{ color: colors.textMuted, fontSize: 13, marginTop: 4 }}>
                  Você não enviou palpite para este jogo.
                </Text>
              )}
            </Card>
          );
        }}
      />
    </Screen>
  );
}
