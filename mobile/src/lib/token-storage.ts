import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

// expo-secure-store não funciona na web; usamos AsyncStorage (localStorage por baixo) nesse caso.
const isWeb = Platform.OS === 'web';

export const tokenStorage = {
  async getItem(key: string): Promise<string | null> {
    return isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  async removeItem(key: string): Promise<void> {
    if (isWeb) {
      await AsyncStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
