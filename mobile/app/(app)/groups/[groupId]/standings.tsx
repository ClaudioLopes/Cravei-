import { useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getStandings, getStandingsHistory } from '../../../../src/api/standings';
import { getCurrentRound } from '../../../../src/api/rounds';
import { Card, EmptyState, Screen, Subtitle, Title } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';
import { TurnoWinner } from '../../../../src/types/api';

const POSICAO_LABEL: Record<number, string> = { 1: '🥇', 2: '🥈', 3: '🥉' };

// history vem ordenado por [turno, posicao] do backend — só precisa juntar os colocados
// consecutivos do mesmo turno num único grupo, preservando a ordem.
function agruparPorTurno(history: TurnoWinner[]): [number, TurnoWinner[]][] {
  const grupos: [number, TurnoWinner[]][] = [];
  for (const winner of history) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && ultimo[0] === winner.turno) {
      ultimo[1].push(winner);
    } else {
      grupos.push([winner.turno, [winner]]);
    }
  }
  return grupos;
}

export default function StandingsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  // null = ainda não escolhido pelo usuário -> usa o turno da rodada atual como padrão
  const [turnoEscolhido, setTurnoEscolhido] = useState<1 | 2 | null>(null);

  const { data: roundAtual, isLoading: carregandoRodada, isError: erroRodada } = useQuery({
    queryKey: ['round', 'current'],
    queryFn: getCurrentRound,
    retry: false,
  });

  // só sabemos o turno "padrão" certo depois que a rodada atual carrega (ou falha, aí usamos 1)
  const turnoPronto = turnoEscolhido !== null || !carregandoRodada || erroRodada;
  const turno = turnoEscolhido ?? roundAtual?.turno ?? 1;

  const { data: standings, isLoading } = useQuery({
    queryKey: ['standings', groupId, turno],
    queryFn: () => getStandings(groupId, turno),
    enabled: !!groupId && turnoPronto,
  });

  const { data: history } = useQuery({
    queryKey: ['standings', 'history', groupId],
    queryFn: () => getStandingsHistory(groupId),
    enabled: !!groupId,
  });

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: 'Classificação' }} />
      <Title>Classificação</Title>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        {([1, 2] as const).map((t) => (
          <Pressable key={t} onPress={() => setTurnoEscolhido(t)} style={{ flex: 1 }}>
            <Card style={turno === t ? { borderColor: colors.accent } : undefined}>
              <Text style={{ color: colors.text, textAlign: 'center', fontWeight: '600' }}>
                {t === 1 ? 'Turno' : 'Returno'}
              </Text>
            </Card>
          </Pressable>
        ))}
      </View>

      <FlatList
        data={standings ?? []}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        ListEmptyComponent={
          !isLoading ? <EmptyState message="Ainda não há pontuação para este turno." /> : null
        }
        renderItem={({ item }) => (
          <Card style={item.posicao === 1 ? { borderColor: colors.accentAlt } : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>
                {item.posicao}º · {item.user.nome}
              </Text>
              <Text style={{ color: colors.accent, fontSize: 18, fontFamily: 'Oswald_700Bold' }}>
                {item.pontosTotais} pts
              </Text>
            </View>
          </Card>
        )}
        ListFooterComponent={
          history && history.length > 0 ? (
            <View style={{ gap: 8, marginTop: 8 }}>
              <Subtitle>Campeões de turno</Subtitle>
              {agruparPorTurno(history).map(([turnoDoGrupo, colocados]) => (
                <Card key={turnoDoGrupo}>
                  <Text style={{ color: colors.text, fontWeight: '600', marginBottom: 4 }}>
                    {turnoDoGrupo === 1 ? 'Turno' : 'Returno'}
                  </Text>
                  {colocados.map((winner) => (
                    <View
                      key={winner.id}
                      style={{ flexDirection: 'row', justifyContent: 'space-between' }}
                    >
                      <Text style={{ color: colors.textMuted }}>
                        {POSICAO_LABEL[winner.posicao] ?? `${winner.posicao}º`} {winner.user.nome}
                      </Text>
                      <Text style={{ color: colors.accentAlt }}>{winner.pontosFinais} pts</Text>
                    </View>
                  ))}
                </Card>
              ))}
            </View>
          ) : null
        }
      />
    </Screen>
  );
}
