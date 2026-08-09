import { ScrollView, View } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getCurrentRound } from '../../../../src/api/rounds';
import { getMyPredictions } from '../../../../src/api/predictions';
import { EmptyState, Screen, Subtitle, Title } from '../../../../src/components/ui';
import { MatchPredictionRow } from '../../../../src/components/match-prediction-row';
import { colors } from '../../../../src/theme/colors';
import { Match, Prediction } from '../../../../src/types/api';

export default function RoundPredictionsScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const { data: round, isLoading } = useQuery({
    queryKey: ['round', 'current'],
    queryFn: getCurrentRound,
    retry: false,
  });

  const { data: myPredictions } = useQuery({
    queryKey: ['predictions', 'me', round?.id],
    queryFn: () => getMyPredictions(round!.id),
    enabled: !!round?.id,
  });

  return (
    <Screen scroll={false}>
      <Stack.Screen options={{ title: round ? `Rodada ${round.numero}` : 'Palpites' }} />

      {!isLoading && !round && (
        <EmptyState message="Nenhuma rodada sincronizada ainda. Aguarde a próxima sincronização de jogos." />
      )}

      {round && (
        <>
          <Title>Rodada {round.numero}</Title>
          <Subtitle>
            Assim que o primeiro jogo começar, todos os palpites da rodada travam — mesmo os de
            jogos que ainda vão começar mais tarde.
          </Subtitle>

          <ScrollView
            contentContainerStyle={{ gap: 12, paddingVertical: 12 }}
            keyboardShouldPersistTaps="handled"
          >
            {round.matches.map((item: Match) => (
              <View key={item.id}>
                <MatchPredictionRow
                  match={item}
                  round={round}
                  groupId={groupId}
                  myPrediction={myPredictions?.find((p: Prediction) => p.matchId === item.id)}
                />
              </View>
            ))}
          </ScrollView>
        </>
      )}
    </Screen>
  );
}
