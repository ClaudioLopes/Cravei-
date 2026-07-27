import { FlatList, Text, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCurrentRound } from '../../../../../src/api/rounds';
import { getMatchPredictions } from '../../../../../src/api/predictions';
import { Card, EmptyState, Screen, Subtitle, Title } from '../../../../../src/components/ui';
import { colors } from '../../../../../src/theme/colors';

export default function MatchPredictionsScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string; groupId: string }>();

  const { data: round } = useQuery({
    queryKey: ['round', 'current'],
    queryFn: getCurrentRound,
    retry: false,
  });
  const match = round?.matches.find((m) => m.id === matchId);

  const { data: predictions } = useQuery({
    queryKey: ['predictions', 'match', matchId],
    queryFn: () => getMatchPredictions(matchId),
    enabled: !!matchId,
  });

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: match ? `${match.timeCasa} x ${match.timeFora}` : 'Palpites' }} />

      {match && (
        <Card>
          <Title>
            {match.timeCasa} x {match.timeFora}
          </Title>
          {match.status === 'ENCERRADO' ? (
            <Subtitle>
              Placar final: {match.placarCasa} x {match.placarFora}
            </Subtitle>
          ) : (
            <Subtitle>Jogo em andamento</Subtitle>
          )}
        </Card>
      )}

      <FlatList
        data={predictions ?? []}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ gap: 8, paddingVertical: 12 }}
        ListEmptyComponent={<EmptyState message="Ninguém enviou palpite para este jogo." />}
        renderItem={({ item }) => (
          <Card>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: colors.text, fontSize: 15 }}>{item.user?.nome ?? 'Você'}</Text>
              <Text style={{ color: colors.accentAlt, fontSize: 18, fontWeight: '700' }}>
                {item.placarCasaPalpite} x {item.placarForaPalpite}
              </Text>
            </View>
          </Card>
        )}
      />
    </Screen>
  );
}
