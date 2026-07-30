import React, { useEffect } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts, Oswald_500Medium, Oswald_700Bold } from '@expo-google-fonts/oswald';
import { WorkSans_400Regular, WorkSans_500Medium, WorkSans_600SemiBold, WorkSans_700Bold } from '@expo-google-fonts/work-sans';
import { AuthProvider } from '../src/context/auth-context';
import { colors } from '../src/theme/colors';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15_000 } },
});

SplashScreen.preventAutoHideAsync().catch(() => {});

// Work Sans vira a fonte padrão de todo <Text> do app (Oswald fica reservado pra títulos e
// placares — ver Title/Subtitle em src/components/ui.tsx). defaultProps não alcança telas que
// já passam um style próprio, então o padrão vai direto no render de Text, na frente da pilha
// de estilos — assim continua perdendo para fontFamily/color explícitos de cada tela.
const TextAny = Text as unknown as { render?: (...args: unknown[]) => any };
const originalTextRender = TextAny.render;
if (typeof originalTextRender === 'function') {
  TextAny.render = function patchedTextRender(...args: unknown[]) {
    const origin = originalTextRender.apply(this, args as never);
    return React.cloneElement(origin, {
      style: [{ fontFamily: 'WorkSans_400Regular', color: colors.text }, origin.props.style],
    });
  };
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Oswald_500Medium,
    Oswald_700Bold,
    WorkSans_400Regular,
    WorkSans_500Medium,
    WorkSans_600SemiBold,
    WorkSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="light" />
        <Stack screenOptions={{ headerShown: false }} />
      </AuthProvider>
    </QueryClientProvider>
  );
}
