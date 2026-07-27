import { useState } from 'react';
import { Stack, router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { getGroupByCode, joinGroup } from '../../../src/api/groups';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '../../../src/components/ui';

export default function JoinGroupScreen() {
  const queryClient = useQueryClient();
  const [codigo, setCodigo] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ id: string; nome: string } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  async function handleBuscar() {
    setError(null);
    setPreview(null);
    if (!codigo.trim()) return;
    setLoadingPreview(true);
    try {
      const group = await getGroupByCode(codigo.trim().toUpperCase());
      setPreview({ id: group.id, nome: group.nome });
    } catch {
      setError('Código de convite inválido.');
    } finally {
      setLoadingPreview(false);
    }
  }

  const mutation = useMutation({
    mutationFn: async () => {
      if (!preview) return;
      return joinGroup(preview.id, codigo.trim().toUpperCase());
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['groups', 'me'] });
      if (preview) router.replace(`/(app)/groups/${preview.id}`);
    },
    onError: () => setError('Não foi possível entrar no grupo.'),
  });

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Entrar em grupo' }} />
      <Title>Entrar em grupo</Title>
      <Subtitle>Digite o código de convite compartilhado pelo dono do grupo.</Subtitle>

      <Field
        label="Código de convite"
        value={codigo}
        onChangeText={setCodigo}
        autoCapitalize="characters"
        placeholder="Ex.: A1B2C3D4"
        onEndEditing={handleBuscar}
      />
      <Button label="Buscar grupo" onPress={handleBuscar} loading={loadingPreview} variant="secondary" />

      {preview && (
        <Card>
          <Title>{preview.nome}</Title>
          <Subtitle>Confirma que este é o grupo certo?</Subtitle>
        </Card>
      )}

      <ErrorText>{error}</ErrorText>
      <Button
        label="Entrar no grupo"
        onPress={() => mutation.mutate()}
        loading={mutation.isPending}
        disabled={!preview}
      />
    </Screen>
  );
}
