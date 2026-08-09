import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { upsertPrediction } from '../api/predictions';
import { Match, Prediction, Round } from '../types/api';
import { effectiveDeadline, formatCountdown, formatDateTime } from '../lib/deadline';
import { colors } from '../theme/colors';
import { Card } from './ui';
import { TeamCrest } from './team-crest';

const JOGO_COMECOU = ['EM_ANDAMENTO', 'ENCERRADO'];

export function MatchPredictionRow({
  match,
  round,
  myPrediction,
  groupId,
}: {
  match: Match;
  round: Pick<Round, 'primeiroJogoOriginal'>;
  myPrediction?: Prediction;
  groupId: string;
}) {
  const queryClient = useQueryClient();
  const [casa, setCasa] = useState(myPrediction ? String(myPrediction.placarCasaPalpite) : '');
  const [fora, setFora] = useState(myPrediction ? String(myPrediction.placarForaPalpite) : '');
  const [justSaved, setJustSaved] = useState(false);

  function handleChangeCasa(value: string) {
    setJustSaved(false);
    setCasa(value);
  }

  function handleChangeFora(value: string) {
    setJustSaved(false);
    setFora(value);
  }

  const deadline = effectiveDeadline(match, round);
  const isLocked = new Date() >= deadline;
  const jogoComecou = JOGO_COMECOU.includes(match.status);

  const mutation = useMutation({
    mutationFn: () =>
      upsertPrediction({
        matchId: match.id,
        placarCasaPalpite: Number(casa),
        placarForaPalpite: Number(fora),
      }),
    onSuccess: () => {
      setJustSaved(true);
      queryClient.invalidateQueries({ queryKey: ['predictions', 'me', match.roundId] });
      queryClient.invalidateQueries({ queryKey: ['predictions-status', groupId] });
    },
  });

  const podeSalvar =
    !isLocked && casa.trim() !== '' && fora.trim() !== '' && !mutation.isPending;

  return (
    <Card>
      <Text style={{ color: colors.textMuted, fontSize: 12 }}>
        {formatDateTime(match.dataHoraPrevista)}
        {match.prazoIndividual ? ' · jogo remarcado (prazo próprio)' : ''}
      </Text>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ flex: 1, color: colors.text, fontSize: 15, textAlign: 'right' }}>
          {match.timeCasa}
        </Text>
        <TeamCrest uri={match.crestCasa} />
        <TextInput
          value={casa}
          onChangeText={handleChangeCasa}
          editable={!isLocked}
          keyboardType="number-pad"
          maxLength={2}
          style={placarInputStyle(isLocked)}
        />
        <Text style={{ color: colors.textMuted }}>x</Text>
        <TextInput
          value={fora}
          onChangeText={handleChangeFora}
          editable={!isLocked}
          keyboardType="number-pad"
          maxLength={2}
          style={placarInputStyle(isLocked)}
        />
        <TeamCrest uri={match.crestFora} />
        <Text style={{ flex: 1, color: colors.text, fontSize: 15 }}>{match.timeFora}</Text>
      </View>

      {match.status === 'ENCERRADO' && match.placarCasa !== null && (
        <Text style={{ color: colors.accentAlt, textAlign: 'center' }}>
          Resultado: {match.placarCasa} x {match.placarFora}
        </Text>
      )}

      <Text style={{ color: isLocked ? colors.danger : colors.textMuted, fontSize: 12, textAlign: 'center' }}>
        {isLocked ? 'Prazo encerrado' : formatCountdown(deadline)}
      </Text>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Pressable
          disabled={!podeSalvar}
          onPress={() => mutation.mutate()}
          style={{
            flex: 1,
            backgroundColor: justSaved ? colors.accentAlt : podeSalvar ? colors.accent : colors.border,
            borderRadius: 8,
            paddingVertical: 10,
            alignItems: 'center',
          }}
        >
          <Text style={{ color: colors.background, fontFamily: 'Oswald_700Bold', textTransform: 'uppercase', letterSpacing: 0.4 }}>
            {mutation.isPending ? 'Salvando…' : justSaved ? '✓ Palpite salvo' : 'Salvar palpite'}
          </Text>
        </Pressable>

        {jogoComecou && (
          <Pressable
            onPress={() => router.push(`/(app)/groups/${groupId}/match/${match.id}`)}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.accent,
              borderRadius: 8,
              paddingVertical: 10,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: colors.accent, fontFamily: 'Oswald_700Bold', textTransform: 'uppercase', letterSpacing: 0.4 }}>Ver palpites</Text>
          </Pressable>
        )}
      </View>
    </Card>
  );
}

function placarInputStyle(disabled: boolean) {
  return {
    width: 48,
    textAlign: 'center' as const,
    fontSize: 18,
    fontFamily: 'Oswald_700Bold',
    color: colors.accent,
    backgroundColor: disabled ? colors.border : colors.surfaceAlt,
    borderRadius: 8,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  };
}
