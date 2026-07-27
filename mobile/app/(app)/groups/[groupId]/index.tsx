import { Share, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { getGroup, getPredictionsStatus } from '../../../../src/api/groups';
import { getCurrentRound } from '../../../../src/api/rounds';
import { Button, Card, EmptyState, Screen, Subtitle, Title } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';
import { effectiveDeadline, formatCountdown, formatDateTime, scoringConfigLabel } from '../../../../src/lib/deadline';
import { PredictionStatusEntry } from '../../../../src/api/groups';

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
  });

  const { data: round } = useQuery({
    queryKey: ['round', 'current'],
    queryFn: getCurrentRound,
    retry: false,
  });

  const { data: status } = useQuery({
    queryKey: ['predictions-status', groupId, round?.id],
    queryFn: () => getPredictionsStatus(groupId, round!.id),
    enabled: !!groupId && !!round?.id,
  });

  if (!group) {
    return (
      <Screen>
        <Stack.Screen options={{ title: 'Grupo' }} />
      </Screen>
    );
  }

  const primeiroJogo = round?.matches?.[0];
  const deadline = round && primeiroJogo ? effectiveDeadline(primeiroJogo, round) : null;

  return (
    <Screen>
      <Stack.Screen options={{ title: group.nome }} />
      <Title>{group.nome}</Title>

      <Card>
        <Subtitle>Código de convite</Subtitle>
        <Text style={{ color: colors.text, fontSize: 22, fontWeight: '700', letterSpacing: 2 }}>
          {group.codigoConvite}
        </Text>
        <Button
          label="Compartilhar convite"
          variant="secondary"
          onPress={() =>
            Share.share({
              message: `Entra no meu bolão "${group.nome}"! Código: ${group.codigoConvite}`,
            })
          }
        />
      </Card>

      <Card>
        <Subtitle>Regra de pontuação</Subtitle>
        <Text style={{ color: colors.text, fontSize: 16, fontWeight: '600' }}>
          {scoringConfigLabel(group.scoringConfig.tipo)}
        </Text>
      </Card>

      <Card>
        <Subtitle>Rodada atual</Subtitle>
        {round ? (
          <>
            <Text style={{ color: colors.text, fontSize: 20, fontWeight: '700' }}>
              Rodada {round.numero}
            </Text>
            {deadline && (
              <Text style={{ color: colors.accentAlt }}>
                Prazo do 1º jogo: {formatDateTime(deadline)} · {formatCountdown(deadline)}
              </Text>
            )}
            <Button
              label="Fazer palpites da rodada"
              onPress={() => router.push(`/(app)/groups/${groupId}/predictions`)}
            />
            <Button
              label="Ver rodadas anteriores"
              variant="secondary"
              onPress={() => router.push(`/(app)/groups/${groupId}/round/${Math.max(1, round.numero - 1)}`)}
            />
          </>
        ) : (
          <Text style={{ color: colors.textMuted }}>
            Nenhuma rodada sincronizada ainda. Aguarde a próxima sincronização de jogos.
          </Text>
        )}
      </Card>

      <Card>
        <Subtitle>Status dos palpites dos membros</Subtitle>
        {!status || status.length === 0 ? (
          <EmptyState message="Sem dados ainda." />
        ) : (
          <View style={{ gap: 8 }}>
            {status.map((entry: PredictionStatusEntry) => (
              <View
                key={entry.user.id}
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}
              >
                <Text style={{ color: colors.text }}>{entry.user.nome}</Text>
                <Text style={{ color: entry.completo ? colors.accent : colors.textMuted }}>
                  {entry.completo ? 'Completo' : `${entry.enviados}/${entry.total}`}
                </Text>
              </View>
            ))}
          </View>
        )}
      </Card>

      <Button
        label="Ver classificação"
        variant="secondary"
        onPress={() => router.push(`/(app)/groups/${groupId}/standings`)}
      />
    </Screen>
  );
}
