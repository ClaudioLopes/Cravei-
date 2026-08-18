import { Alert, Platform, Share, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { deleteGroup, getGroup, getPredictionsStatus } from '../../../../src/api/groups';
import { getCurrentRound } from '../../../../src/api/rounds';
import { useAuth } from '../../../../src/context/auth-context';
import { Button, Card, EmptyState, Screen, Subtitle, Title } from '../../../../src/components/ui';
import { colors } from '../../../../src/theme/colors';
import { effectiveDeadline, formatCountdown, formatDateTime, scoringConfigLabel } from '../../../../src/lib/deadline';
import { PredictionStatusEntry } from '../../../../src/api/groups';

function confirmAsync(title: string, message: string): Promise<boolean> {
  if (Platform.OS === 'web') {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: 'Cancelar', style: 'cancel', onPress: () => resolve(false) },
      { text: 'Excluir', style: 'destructive', onPress: () => resolve(true) },
    ]);
  });
}

function showAlert(title: string, message: string) {
  if (Platform.OS === 'web') {
    window.alert(`${title}\n\n${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function GroupDetailScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: group } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId),
    enabled: !!groupId,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteGroup(groupId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups', 'me'] });
      router.replace('/(app)/groups');
    },
    onError: (err: any) => {
      showAlert('Erro', err?.response?.data?.message ?? 'Não foi possível excluir o grupo.');
    },
  });

  async function confirmarExclusao() {
    const confirmado = await confirmAsync(
      'Excluir grupo',
      `Tem certeza que deseja excluir "${group?.nome}"? Essa ação não pode ser desfeita.`,
    );
    if (confirmado) {
      deleteMutation.mutate();
    }
  }

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

      {group.donoId === user?.id && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Button
              label="Editar grupo"
              variant="secondary"
              disabled={!!group.iniciado}
              onPress={() => router.push(`/(app)/groups/${groupId}/edit`)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Excluir grupo"
              variant="danger"
              loading={deleteMutation.isPending}
              onPress={confirmarExclusao}
            />
          </View>
        </View>
      )}
      {group.donoId === user?.id && group.iniciado && (
        <Text style={{ color: colors.textMuted, fontSize: 12 }}>
          Este grupo já teve palpites/turnos iniciados, por isso não pode mais ser editado.
        </Text>
      )}

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
