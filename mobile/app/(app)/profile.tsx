import { useState } from 'react';
import { Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../src/context/auth-context';
import * as usersApi from '../../src/api/users';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateMe({ nome: nome.trim() }),
    onError: () => setError('Não foi possível salvar seu nome.'),
  });

  async function handleLogout() {
    await logout();
    router.replace('/(auth)/login');
  }

  return (
    <Screen>
      <Stack.Screen options={{ title: 'Perfil' }} />
      <Title>Perfil</Title>

      <Card>
        <Subtitle>Email</Subtitle>
        <Text style={{ color: colors.text, fontSize: 16 }}>{user?.email}</Text>
      </Card>

      <View style={{ gap: 12 }}>
        <Field label="Nome" value={nome} onChangeText={setNome} />
        <ErrorText>{error}</ErrorText>
        <Button
          label="Salvar"
          onPress={() => mutation.mutate()}
          loading={mutation.isPending}
          variant="secondary"
        />
      </View>

      <Card>
        <Subtitle>Notificações</Subtitle>
        <Text style={{ color: colors.textMuted }}>
          Você recebe um aviso push 15 minutos antes do primeiro jogo de cada rodada, caso ainda
          tenha palpites pendentes em algum dos seus grupos.
        </Text>
      </Card>

      <Button label="Sair da conta" variant="danger" onPress={handleLogout} />
    </Screen>
  );
}
