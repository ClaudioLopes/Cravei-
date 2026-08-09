import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createGroup } from '../../../src/api/groups';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '../../../src/components/ui';
import { colors } from '../../../src/theme/colors';
import { ScoringConfig, ScoringType } from '../../../src/types/api';

const TIPO_OPTIONS: { value: ScoringType; label: string; helper: string }[] = [
  { value: 'placar_exato', label: 'Placar exato', helper: 'Só pontua quem acerta o placar exato (1 ponto).' },
  {
    value: 'resultado_simples',
    label: 'Resultado simples',
    helper: 'Pontua quem acerta só o vencedor/empate.',
  },
  {
    value: 'camadas',
    label: 'Camadas',
    helper: 'Pontos diferentes para placar exato e para acertar só o resultado.',
  },
];

export default function CreateGroupScreen() {
  const queryClient = useQueryClient();
  const [nome, setNome] = useState('');
  const [tipo, setTipo] = useState<'PUBLICO' | 'PRIVADO'>('PRIVADO');
  const [scoringTipo, setScoringTipo] = useState<ScoringType>('placar_exato');
  const [pontosPlacarExato, setPontosPlacarExato] = useState('3');
  const [pontosResultado, setPontosResultado] = useState('1');
  const [podioTamanho, setPodioTamanho] = useState<1 | 3>(1);
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const scoringConfig: ScoringConfig =
        scoringTipo === 'camadas'
          ? {
              tipo: scoringTipo,
              pontosPlacarExato: Number(pontosPlacarExato) || 3,
              pontosResultado: Number(pontosResultado) || 1,
            }
          : { tipo: scoringTipo };
      return createGroup({ nome: nome.trim(), tipo, scoringConfig, podioTamanho });
    },
    onSuccess: async (group) => {
      await queryClient.invalidateQueries({ queryKey: ['groups', 'me'] });
      router.replace(`/(app)/groups/${group.id}`);
    },
    onError: (err: any) => {
      setError(err?.response?.data?.message ?? 'Não foi possível criar o grupo.');
    },
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Criar grupo' }} />
      <Title>Novo grupo</Title>
      <Subtitle>Defina o nome e a regra de pontuação. A regra trava assim que alguém enviar o primeiro palpite do turno.</Subtitle>

      <Field label="Nome do grupo" value={nome} onChangeText={setNome} placeholder="Ex.: Bolão da firma" />

      <View style={{ gap: 8 }}>
        <Subtitle>Visibilidade</Subtitle>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {(['PRIVADO', 'PUBLICO'] as const).map((option) => (
            <Pressable key={option} onPress={() => setTipo(option)} style={{ flex: 1 }}>
              <Card style={tipo === option ? { borderColor: colors.accent } : undefined}>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {option === 'PRIVADO' ? 'Privado' : 'Público'}
                </Text>
              </Card>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={{ gap: 8 }}>
        <Subtitle>Regra de pontuação</Subtitle>
        {TIPO_OPTIONS.map((option) => (
          <Pressable key={option.value} onPress={() => setScoringTipo(option.value)}>
            <Card style={scoringTipo === option.value ? { borderColor: colors.accent } : undefined}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>{option.label}</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{option.helper}</Text>
            </Card>
          </Pressable>
        ))}
      </View>

      {scoringTipo === 'camadas' && (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Field
              label="Pontos placar exato"
              value={pontosPlacarExato}
              onChangeText={setPontosPlacarExato}
              keyboardType="number-pad"
            />
          </View>
          <View style={{ flex: 1 }}>
            <Field
              label="Pontos só resultado"
              value={pontosResultado}
              onChangeText={setPontosResultado}
              keyboardType="number-pad"
            />
          </View>
        </View>
      )}

      <View style={{ gap: 8 }}>
        <Subtitle>Campeão do turno</Subtitle>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => setPodioTamanho(1)} style={{ flex: 1 }}>
            <Card style={podioTamanho === 1 ? { borderColor: colors.accent } : undefined}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Só o líder</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Reconhece 1 campeão por turno.</Text>
            </Card>
          </Pressable>
          <Pressable onPress={() => setPodioTamanho(3)} style={{ flex: 1 }}>
            <Card style={podioTamanho === 3 ? { borderColor: colors.accent } : undefined}>
              <Text style={{ color: colors.text, fontWeight: '600' }}>Pódio (1º, 2º, 3º)</Text>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>Reconhece os 3 primeiros colocados.</Text>
            </Card>
          </Pressable>
        </View>
      </View>

      <ErrorText>{error}</ErrorText>
      <Button
        label="Criar grupo"
        loading={mutation.isPending}
        disabled={!nome.trim()}
        onPress={() => mutation.mutate()}
      />
    </Screen>
  );
}
