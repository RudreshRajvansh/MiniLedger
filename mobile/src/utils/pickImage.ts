import { Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = {
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  allowsEditing: true,
  quality: 0.8,
};

async function fromLibrary(): Promise<string | null> {
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Photo gallery permission is required.');
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
  return !result.canceled && result.assets[0]?.uri ? result.assets[0].uri : null;
}

async function fromCamera(): Promise<string | null> {
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Denied', 'Camera permission is required.');
    return null;
  }
  const result = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
  return !result.canceled && result.assets[0]?.uri ? result.assets[0].uri : null;
}

/**
 * Lets the user pick a receipt photo from the camera or gallery.
 * Resolves with the local image URI, or null if cancelled / denied.
 * Browsers have no camera/gallery choice sheet, so web opens the file picker directly.
 */
export function pickReceiptImage(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return fromLibrary();
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Attach receipt',
      'Choose source:',
      [
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) },
        { text: 'Camera', onPress: () => fromCamera().then(resolve) },
        { text: 'Photo Gallery', onPress: () => fromLibrary().then(resolve) },
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}
