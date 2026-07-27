import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from '../api/users';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// Pede permissão, obtém o Expo push token e registra no backend. Não faz nada em
// emulador/web (não recebem push de verdade) nem se o usuário negar a permissão.
export async function registerForPushNotifications(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    return;
  }

  const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });

  try {
    await registerPushToken(expoPushToken);
  } catch {
    // se falhar (ex.: sem rede), tenta de novo na próxima vez que o app abrir
  }
}
