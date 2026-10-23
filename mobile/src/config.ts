import { Platform } from 'react-native';

/**
 * API configuration for MiniLedger Mobile.
 *
 * Networking notes for React Native:
 * - Android Emulator: uses 10.0.2.2 to access host machine's localhost.
 * - iOS Simulator / Web: uses localhost:3000 directly.
 * - Physical device via Expo Go: change this to your computer's local Wi-Fi IP (e.g., http://192.168.1.15:3000).
 */
export const API_BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000';
