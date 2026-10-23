import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { createLoan, uploadReceipt } from '../api/loans.api';
import { getErrorMessage } from '../api/client';
import { getDefaultDueDate, formatFriendlyDate, formatDateToISOString } from '../utils/date';
import { PrimaryButton } from '../components/PrimaryButton';
import { ErrorBanner } from '../components/ErrorBanner';

export const AddLoanScreen: React.FC = () => {
  const navigation = useNavigation();

  // Form fields
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7); // Default to 7 days from now
    return d;
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  // Validation & status states
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  // Client-side validation mirroring the server Zod schema
  const validateForm = (): boolean => {
    const errors: { [key: string]: string } = {};

    const trimmedName = friendName.trim();
    if (!trimmedName) {
      errors.friendName = 'Friend name is required';
    } else if (trimmedName.length > 100) {
      errors.friendName = 'Friend name must be at most 100 characters';
    }

    const numAmount = parseFloat(amount);
    if (!amount || isNaN(numAmount)) {
      errors.amount = 'Please enter a valid numeric amount';
    } else if (numAmount <= 0) {
      errors.amount = 'Amount must be greater than zero';
    } else if (numAmount > 10_000_000) {
      errors.amount = 'Amount cannot exceed ₹10,000,000';
    } else if (Number(numAmount.toFixed(2)) !== numAmount) {
      errors.amount = 'Amount can have at most 2 decimal places';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const handlePickImage = () => {
    Alert.alert('Attach Receipt', 'Choose source:', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Camera',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera permission is required.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]?.uri) {
            setReceiptUri(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Photo Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Photo gallery permission is required.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.8,
          });
          if (!result.canceled && result.assets[0]?.uri) {
            setReceiptUri(result.assets[0].uri);
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    setGeneralError(null);
    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1. Create the loan entry
      const isoDate = formatDateToISOString(dueDate);
      const newLoan = await createLoan({
        friendName: friendName.trim(),
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        dueDate: isoDate,
      });

      // 2. If a receipt was attached, upload it
      if (receiptUri) {
        try {
          await uploadReceipt(newLoan.id, receiptUri);
        } catch (uploadErr) {
          // Graceful degradation: entry is saved, but notify reviewer
          Alert.alert(
            'Entry Saved',
            'Loan was saved, but receipt upload failed. You can re-upload later.',
            [{ text: 'OK', onPress: () => navigation.goBack() }],
          );
          return;
        }
      }

      navigation.goBack();
    } catch (err) {
      setGeneralError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>Add Loan Entry</Text>
      <Text style={styles.subtitle}>
        Record money you lent to a friend or colleague.
      </Text>

      <ErrorBanner
        message={generalError}
        onDismiss={() => setGeneralError(null)}
      />

      {/* Field: Friend Name */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Friend's Name *</Text>
        <TextInput
          style={[styles.input, fieldErrors.friendName ? styles.inputError : null]}
          placeholder="e.g. Vikram Verma"
          value={friendName}
          onChangeText={(val) => {
            setFriendName(val);
            if (fieldErrors.friendName) {
              setFieldErrors((prev) => ({ ...prev, friendName: '' }));
            }
          }}
          editable={!loading}
        />
        {fieldErrors.friendName && (
          <Text style={styles.errorText}>{fieldErrors.friendName}</Text>
        )}
      </View>

      {/* Field: Amount */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Amount (₹) *</Text>
        <TextInput
          style={[styles.input, fieldErrors.amount ? styles.inputError : null]}
          placeholder="e.g. 2500"
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(val) => {
            setAmount(val);
            if (fieldErrors.amount) {
              setFieldErrors((prev) => ({ ...prev, amount: '' }));
            }
          }}
          editable={!loading}
        />
        {fieldErrors.amount && (
          <Text style={styles.errorText}>{fieldErrors.amount}</Text>
        )}
      </View>

      {/* Field: Due Date */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Expected Repayment Date *</Text>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
          disabled={loading}
        >
          <Text style={styles.dateText}>
            📅 {formatFriendlyDate(formatDateToISOString(dueDate))}
          </Text>
          <Text style={styles.changeDateLabel}>Change</Text>
        </TouchableOpacity>

        {showDatePicker && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onDateChange}
          />
        )}
      </View>

      {/* Field: Receipt Photo (Optional) */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Receipt Photo (Optional)</Text>

        {receiptUri ? (
          <View style={styles.receiptPreviewContainer}>
            <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
            <TouchableOpacity
              style={styles.removeReceiptBtn}
              onPress={() => setReceiptUri(null)}
              disabled={loading}
            >
              <Text style={styles.removeReceiptText}>✕ Remove photo</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.attachBtn}
            onPress={handlePickImage}
            disabled={loading}
          >
            <Text style={styles.attachBtnText}>📷 Attach Receipt (Camera / Gallery)</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Submit Button */}
      <PrimaryButton
        title="Save Loan Entry"
        onPress={handleSubmit}
        loading={loading}
        disabled={loading}
        style={styles.submitBtn}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 20,
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputError: {
    borderColor: '#EF4444',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
  },
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
  },
  dateText: {
    fontSize: 16,
    color: '#0F172A',
    fontWeight: '500',
  },
  changeDateLabel: {
    fontSize: 14,
    color: '#2563EB',
    fontWeight: '600',
  },
  attachBtn: {
    borderWidth: 1,
    borderColor: '#93C5FD',
    borderStyle: 'dashed',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
  },
  attachBtnText: {
    color: '#1D4ED8',
    fontSize: 14,
    fontWeight: '600',
  },
  receiptPreviewContainer: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  receiptPreview: {
    width: 200,
    height: 150,
    borderRadius: 6,
    resizeMode: 'cover',
  },
  removeReceiptBtn: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#FEE2E2',
    borderRadius: 6,
  },
  removeReceiptText: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '600',
  },
  submitBtn: {
    marginTop: 12,
  },
});
