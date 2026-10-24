import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * Persistent key-value storage.
 * - iOS/Android: encrypted on-device storage via expo-secure-store.
 * - Web: SecureStore is unavailable, so fall back to localStorage
 *   (used only for the browser demo build).
 */
export async function getItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function setItem(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      // Storage may be blocked (private mode); session simply won't persist
    }
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItem(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    try {
      window.localStorage.removeItem(key);
    } catch {
      // ignore
    }
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
