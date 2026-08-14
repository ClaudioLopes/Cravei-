import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, AppStateStatus, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/context/auth-context';
import { colors } from '../../src/theme/colors';
import { registerForPushNotifications } from '../../src/lib/push-notifications';
import { authenticateWithBiometrics, isBiometricLoginEnabled } from '../../src/lib/biometric-auth';
import { Button, Screen, Subtitle, Title } from '../../src/components/ui';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const [locked, setLocked] = useState(false);
  const appState = useRef(AppState.currentState);
  // O próprio prompt do Face ID/Touch ID faz o app "sair e voltar" do primeiro plano do
  // ponto de vista do AppState — sem essa trava, o listener abaixo interpretava a volta do
  // prompt como "usuário voltou do segundo plano" e chamava tryUnlock() de novo, num loop.
  const authenticatingRef = useRef(false);

  const tryUnlock = useCallback(async () => {
    if (authenticatingRef.current) return;
    if (!(await isBiometricLoginEnabled())) {
      setLocked(false);
      return;
    }
    setLocked(true);
    authenticatingRef.current = true;
    try {
      const success = await authenticateWithBiometrics();
      if (success) setLocked(false);
    } finally {
      authenticatingRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(() => {});
      tryUnlock();
    }
  }, [user, tryUnlock]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next: AppStateStatus) => {
      // Só "background" conta como o app tendo saído de verdade (usuário trocou de app,
      // bloqueou o aparelho). "inactive" também acontece em blips transitórios — central de
      // controle, ligação chegando, e o próprio prompt do Face ID — e não deve re-travar.
      if (appState.current === 'background' && next === 'active' && user) {
        tryUnlock();
      }
      appState.current = next;
    });
    return () => subscription.remove();
  }, [user, tryUnlock]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    );
  }

  if (!user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (locked) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <Title>Cravei!</Title>
          <Subtitle>Confirme sua digital ou Face ID pra continuar.</Subtitle>
          <Button label="Tentar novamente" onPress={tryUnlock} />
        </View>
      </Screen>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
