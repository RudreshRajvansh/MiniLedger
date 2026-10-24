import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createLoan, uploadReceipt } from '../api/loans.api';
import { getErrorMessage } from '../api/client';
import { formatFriendlyDate, formatDateToISOString, addDays, daysUntil } from '../utils/date';
import { formatCurrency } from '../utils/formatCurrency';
import { PrimaryButton } from '../components/PrimaryButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { Avatar } from '../components/Avatar';
import { colors, radius, shadow, spacing } from '../theme';

const QUICK_AMOUNTS = [500, 1000, 2000, 5000];
const QUICK_DUE = [
  { label: '1 week', days: 7 },
  { label: '2 weeks', days: 14 },
  { label: '1 month', days: 30 },
];

export const AddLoanScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  // Form fields
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState<Date>(() => addDays(new Date(), 7));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptUri, setReceiptUri] = useState<string | null>(null);

  // Validation & status states
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [generalError, setGeneralError] = useState<string | null>(null);

  const dueIso = formatDateToISOString(dueDate);
  const dueInDays = daysUntil(dueIso);

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
      errors.amount = 'Enter how much you lent';
    } else if (numAmount <= 0) {
      errors.amount = 'Amount must be greater than zero';
    } else if (numAmount > 10_000_000) {
      errors.amount = 'Amount cannot exceed ₹1,00,00,000';
    } else if (Number(numAmount.toFixed(2)) !== numAmount) {
      errors.amount = 'Amount can have at most 2 decimal places';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const clearFieldError = (key: string) => {
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: '' }));
    }
  };

  const onDateChange = (_event: DateTimePickerEvent, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDueDate(selectedDate);
    }
  };

  const pickFromLibrary = async () => {
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
  };

  const pickFromCamera = async () => {
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
  };

  const handlePickImage = () => {
    // Browsers have no camera/gallery choice sheet; open the file picker directly
    if (Platform.OS === 'web') {
      pickFromLibrary();
      return;
    }
    Alert.alert('Attach receipt', 'Choose source:', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Camera', onPress: pickFromCamera },
      { text: 'Photo Gallery', onPress: pickFromLibrary },
    ]);
  };

  const handleSubmit = async () => {
    setGeneralError(null);
    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1. Create the loan entry
      const newLoan = await createLoan({
        friendName: friendName.trim(),
        amount: parseFloat(parseFloat(amount).toFixed(2)),
        dueDate: dueIso,
      });

      // 2. If a receipt was attached, upload it
      if (receiptUri) {
        try {
          await uploadReceipt(newLoan.id, receiptUri);
        } catch {
          // Graceful degradation: entry is saved, but notify the user
          Alert.alert(
            'Entry saved',
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

  const parsedAmount = parseFloat(amount);
  const hasValidAmount = !isNaN(parsedAmount) && parsedAmount > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ErrorBanner message={generalError} onDismiss={() => setGeneralError(null)} />

        {/* Amount hero */}
        <View style={[styles.amountCard, fieldErrors.amount ? styles.cardError : null]}>
          <Text style={styles.amountLabel}>Amount lent</Text>
          <View style={styles.amountRow}>
            <Text style={styles.currency}>₹</Text>
            <TextInput
              style={styles.amountInput}
              placeholder="0"
              placeholderTextColor={colors.borderStrong}
              keyboardType="decimal-pad"
              value={amount}
              onChangeText={(val) => {
                setAmount(val.replace(/[^0-9.]/g, ''));
                clearFieldError('amount');
              }}
              editable={!loading}
              autoFocus
            />
          </View>
          <View style={styles.chipRow}>
            {QUICK_AMOUNTS.map((value) => {
              const selected = parsedAmount === value;
              return (
                <Pressable
                  key={value}
                  onPress={() => {
                    setAmount(String(value));
                    clearFieldError('amount');
                  }}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                    {formatCurrency(value)}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          {fieldErrors.amount ? <Text style={styles.errorText}>{fieldErrors.amount}</Text> : null}
        </View>

        {/* Field: Friend Name */}
        <Text style={styles.label}>Lent to</Text>
        <View style={[styles.inputRow, fieldErrors.friendName ? styles.inputError : null]}>
          {friendName.trim() ? (
            <Avatar name={friendName} size={32} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarPlaceholderText}>👤</Text>
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder="Friend's name"
            placeholderTextColor={colors.textFaint}
            value={friendName}
            onChangeText={(val) => {
              setFriendName(val);
              clearFieldError('friendName');
            }}
            editable={!loading}
            autoCapitalize="words"
            maxLength={100}
          />
        </View>
        {fieldErrors.friendName ? (
          <Text style={styles.errorText}>{fieldErrors.friendName}</Text>
        ) : null}

        {/* Field: Due Date */}
        <Text style={styles.label}>Expected back by</Text>
        <View style={styles.chipRow}>
          {QUICK_DUE.map((opt) => {
            const selected = dueInDays === opt.days;
            return (
              <Pressable
                key={opt.label}
                onPress={() => setDueDate(addDays(new Date(), opt.days))}
                style={[styles.chip, styles.chipOutline, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.dateSelector}>
          <View style={styles.dateIcon}>
            <Text style={styles.dateIconText}>📅</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dateText}>{formatFriendlyDate(dueIso)}</Text>
            <Text style={styles.dateHint}>
              {dueInDays < 0
                ? `${Math.abs(dueInDays)} days ago · will show as overdue`
                : dueInDays === 0
                  ? 'Today'
                  : `In ${dueInDays} ${dueInDays === 1 ? 'day' : 'days'}`}
            </Text>
          </View>
          {Platform.OS === 'web' ? (
            // Native date input in the browser build; styled to sit on top of the "Change" label
            <View>
              <Text style={styles.changeDateLabel}>Change</Text>
              {React.createElement('input', {
                type: 'date',
                value: dueIso,
                onChange: (e: { target: { value: string } }) => {
                  const [y, m, d] = e.target.value.split('-').map(Number);
                  if (y && m && d) setDueDate(new Date(y, m - 1, d));
                },
                style: {
                  position: 'absolute',
                  inset: 0,
                  opacity: 0,
                  cursor: 'pointer',
                  width: '100%',
                  height: '100%',
                },
              })}
            </View>
          ) : (
            <Pressable onPress={() => setShowDatePicker(true)} disabled={loading} hitSlop={8}>
              <Text style={styles.changeDateLabel}>Change</Text>
            </Pressable>
          )}
        </View>

        {showDatePicker && Platform.OS !== 'web' && (
          <DateTimePicker
            value={dueDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={onDateChange}
          />
        )}

        {/* Field: Receipt Photo (Optional) */}
        <Text style={styles.label}>
          Receipt <Text style={styles.optional}>· optional</Text>
        </Text>

        {receiptUri ? (
          <View style={styles.receiptPreviewContainer}>
            <Image source={{ uri: receiptUri }} style={styles.receiptPreview} />
            <View style={{ flex: 1 }}>
              <Text style={styles.receiptTitle}>Photo attached</Text>
              <Text style={styles.receiptSub}>Uploads when you save</Text>
            </View>
            <Pressable
              style={styles.removeReceiptBtn}
              onPress={() => setReceiptUri(null)}
              disabled={loading}
            >
              <Text style={styles.removeReceiptText}>Remove</Text>
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={({ pressed }) => [styles.attachBtn, pressed && { opacity: 0.7 }]}
            onPress={handlePickImage}
            disabled={loading}
          >
            <Text style={styles.attachIcon}>📷</Text>
            <Text style={styles.attachBtnText}>Add a photo of the receipt</Text>
            <Text style={styles.attachSub}>JPG, PNG or WEBP · up to 5 MB</Text>
          </Pressable>
        )}
      </ScrollView>

      {/* Sticky save bar */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
        <PrimaryButton
          title={
            hasValidAmount && friendName.trim()
              ? `Save ${formatCurrency(parsedAmount)} to ${friendName.trim().split(' ')[0]}`
              : 'Save loan'
          }
          onPress={handleSubmit}
          loading={loading}
          disabled={loading}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  amountCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.xl,
    ...shadow(2),
  },
  cardError: {
    borderColor: colors.danger,
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textMuted,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    marginBottom: spacing.lg,
  },
  currency: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.textFaint,
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    minWidth: 0,
    width: '100%',
    fontSize: 44,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    paddingVertical: 0,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipOutline: {
    backgroundColor: colors.surface,
    marginBottom: spacing.md,
  },
  chipSelected: {
    backgroundColor: colors.ink,
    borderColor: colors.ink,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  optional: {
    color: colors.textFaint,
    fontWeight: '500',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    height: 56,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  inputError: {
    borderColor: colors.danger,
    marginBottom: 4,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 14,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    marginLeft: spacing.md,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  errorText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 6,
    marginBottom: spacing.md,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    backgroundColor: colors.surface,
    marginBottom: spacing.lg,
  },
  dateIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  dateIconText: {
    fontSize: 18,
  },
  dateText: {
    fontSize: 16,
    color: colors.text,
    fontWeight: '700',
  },
  dateHint: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  changeDateLabel: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '700',
    paddingHorizontal: 4,
  },
  attachBtn: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  attachIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  attachBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  attachSub: {
    color: colors.textFaint,
    fontSize: 12,
    marginTop: 2,
  },
  receiptPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptPreview: {
    width: 56,
    height: 56,
    borderRadius: radius.sm,
    marginRight: spacing.md,
  },
  receiptTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  receiptSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  removeReceiptBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: colors.dangerSoft,
    borderRadius: radius.sm,
  },
  removeReceiptText: {
    color: colors.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
