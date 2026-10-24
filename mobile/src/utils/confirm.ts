import { Alert, Platform } from 'react-native';

/**
 * Cross-platform confirmation dialog.
 * Alert.alert with buttons is a no-op on react-native-web, so the web
 * build falls back to the browser's native confirm().
 */
export function confirmAction(
  title: string,
  message: string,
  confirmText: string,
  onConfirm: () => void,
): void {
  if (Platform.OS === 'web') {
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: confirmText, onPress: onConfirm },
  ]);
}
