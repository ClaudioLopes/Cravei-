import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/context/auth-context';
import { colors } from '../../src/theme/colors';
import { registerForPushNotifications } from '../../src/lib/push-notifications';

export default function AppLayout() {
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (user) {
      registerForPushNotifications().catch(() => {});
    }
  }, [user]);

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
