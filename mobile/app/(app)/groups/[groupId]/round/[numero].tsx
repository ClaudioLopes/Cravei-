import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getRoundByNumber } from '../../../../../src/api/rounds';
import { getMyPredictions } from '../../../../../src/api/predictions';
import { Card, EmptyState, Screen, Subtitle, Title } from '../../../../../src/components/ui';
import { colors } from '../../../../../src/theme/colors';
import { formatDateTime } from '../../../../../src/lib/deadline';
import { Match, Prediction } from '../../../../../src/types/api';

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

function avaliarPalpite(pred: Prediction, match: Match): 'exato' | 'resultado' | 'errou' | null {
  if (match.placarCasa === null || match.placarFora === null) return null;
  const acertouExato =
    pred.placarCasaPalpite === match.placarCasa && pred.placarForaPalpite === match.placarFora;
  if (acertouExato) return 'exato';
  const resultadoReal = resultadoDoJogo(match.placarCasa, match.placarFora);
  const resultadoPalpite = resultadoDoJogo(pred.placarCasaPalpite, pred.placarForaPalpite);
  return resultadoReal === resultadoPalpite ? 'resultado' : 'errou';
}

const AVALIACAO_LABEL: Record<'exato' | 'resultado' | 'errou', { texto: string; cor: string }> = {
  exato: { texto: '✓ Placar exato', cor: colors.accent },
  resultado: { texto: '≈ Acertou o resultado', cor: colors.accentAlt },
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
        keyExtractor={(m) => m.id}
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        renderItem={({ item }) => {
          const meuPalpite = minhasPredicoes?.find((p) => p.matchId === item.id);
          const avaliacao = meuPalpite ? avaliarPalpite(meuPalpite, item) : null;

          return (
            <Card>
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                {formatDateTime(item.dataHoraPrevista)} · {STATUS_LABEL[item.status]}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                <Text style={{ flex: 1, color: colors.text, fontSize: 15, textAlign: 'right' }}>
                  {item.timeCasa}
                </Text>
                <Text style={{ color: colors.accentAlt, fontSize: 18, fontWeight: '700' }}>
                  {item.status === 'ENCERRADO' || item.status === 'EM_ANDAMENTO'
                    ? `${item.placarCasa ?? 0} x ${item.placarFora ?? 0}`
                    : 'x'}
                </Text>
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
