import { useEffect, useState } from 'react';
import { Switch, Text, View } from 'react-native';
import { Stack, router } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { useAuth } from '../../src/context/auth-context';
import * as usersApi from '../../src/api/users';
import {
  isBiometricAvailable,
  isBiometricLoginEnabled,
  setBiometricLoginEnabled,
} from '../../src/lib/biometric-auth';
import { Button, Card, ErrorText, Field, Screen, Subtitle, Title } from '../../src/components/ui';
import { colors } from '../../src/theme/colors';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [nome, setNome] = useState(user?.nome ?? '');
  const [error, setError] = useState<string | null>(null);
  const [biometricSupported, setBiometricSupported] = useState(false);
  const [biometricEnabled, setBiometricEnabledState] = useState(false);

  useEffect(() => {
    (async () => {
      const supported = await isBiometricAvailable();
      setBiometricSupported(supported);
      if (supported) {
        setBiometricEnabledState(await isBiometricLoginEnabled());
      }
    })();
  }, []);

  const mutation = useMutation({
    mutationFn: () => usersApi.updateMe({ nome: nome.trim() }),
    onError: () => setError('Não foi possível salvar seu nome.'),
  });

  async function handleToggleBiometric(value: boolean) {
    setBiometricEnabledState(value);
    await setBiometricLoginEnabled(value);
  }

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

      {biometricSupported && (
        <Card>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Subtitle>Entrar com Face ID / digital</Subtitle>
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>
                Pede a biometria do aparelho toda vez que você abrir o app.
              </Text>
            </View>
            <Switch
              value={biometricEnabled}
              onValueChange={handleToggleBiometric}
              trackColor={{ false: colors.border, true: colors.accent }}
              thumbColor={colors.text}
            />
          </View>
        </Card>
      )}

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
