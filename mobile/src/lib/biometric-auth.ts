import * as LocalAuthentication from 'expo-local-authentication';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PREF_KEY = 'biometricLoginEnabled';

export async function isBiometricAvailable(): Promise<boolean> {
  const hasHardware = await LocalAuthentication.hasHardwareAsync();
  if (!hasHardware) return false;
  return LocalAuthentication.isEnrolledAsync();
}

export async function isBiometricLoginEnabled(): Promise<boolean> {
  const value = await AsyncStorage.getItem(PREF_KEY);
  return value === 'true';
}

export async function setBiometricLoginEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(PREF_KEY, enabled ? 'true' : 'false');
}

export async function authenticateWithBiometrics(): Promise<boolean> {
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: 'Entrar no Cravei!',
    cancelLabel: 'Cancelar',
    disableDeviceFallback: false,
  });
  return result.success;
}
