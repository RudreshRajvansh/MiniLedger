import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { requestOtp, verifyOtp } from '../api/auth.api';
import { getErrorMessage } from '../api/client';
import { PrimaryButton } from '../components/PrimaryButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { colors, radius, shadow, spacing } from '../theme';

const OTP_LENGTH = 6;

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();
  const insets = useSafeAreaInsets();
  const otpInputRef = useRef<TextInput>(null);

  // Step 1: 'phone' | Step 2: 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpFocused, setOtpFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 30-second countdown for Resend OTP
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (step === 'otp' && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0) {
      setCanResend(true);
    }
    return () => clearTimeout(timer);
  }, [step, countdown]);

  const handleSendOtp = async () => {
    setErrorMessage(null);
    const cleaned = phone.trim();

    if (!cleaned) {
      setErrorMessage('Please enter your phone number');
      return;
    }

    setLoading(true);
    try {
      await requestOtp(cleaned);
      setStep('otp');
      setCountdown(30);
      setCanResend(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (code: string = otp) => {
    setErrorMessage(null);
    const cleanedOtp = code.trim();

    if (cleanedOtp.length !== OTP_LENGTH) {
      setErrorMessage('Please enter the full 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOtp(phone.trim(), cleanedOtp);
      await login(data.token, data.user);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
      setLoading(false);
    }
  };

  const handleOtpChange = (val: string) => {
    const digits = val.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(digits);
    // Auto-submit once all six digits are in
    if (digits.length === OTP_LENGTH && !loading) {
      handleVerifyOtp(digits);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      await requestOtp(phone.trim());
      setOtp('');
      setCountdown(30);
      setCanResend(false);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChangeNumber = () => {
    setStep('phone');
    setOtp('');
    setErrorMessage(null);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        bounces={false}
      >
        {/* Brand hero */}
        <View style={[styles.hero, { paddingTop: insets.top + 48 }]}>
          <View style={[styles.ring, styles.ringA]} />
          <View style={[styles.ring, styles.ringB]} />

          <View style={styles.logoMark}>
            <Text style={styles.logoMarkText}>₹</Text>
          </View>
          <Text style={styles.brand}>MiniLedger</Text>
          <Text style={styles.tagline}>
            Lend to friends.{'\n'}Never lose track of it.
          </Text>

          <View style={styles.features}>
            <Feature icon="⏰" text="Overdue alerts" />
            <Feature icon="🧾" text="Photo receipts" />
            <Feature icon="🔒" text="OTP login" />
          </View>
        </View>

        {/* Auth sheet */}
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.xxl }]}>
          {step === 'phone' ? (
            /* STEP 1: PHONE INPUT */
            <View>
              <Text style={styles.sheetTitle}>Sign in</Text>
              <Text style={styles.sheetSubtitle}>
                We’ll text a one-time code to your mobile number.
              </Text>

              <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

              <Text style={styles.label}>Mobile number</Text>
              <View style={styles.phoneField}>
                <View style={styles.prefix}>
                  <Text style={styles.prefixText}>+91</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="98765 43210"
                  placeholderTextColor={colors.textFaint}
                  keyboardType="phone-pad"
                  value={phone}
                  onChangeText={setPhone}
                  editable={!loading}
                  onSubmitEditing={handleSendOtp}
                  returnKeyType="send"
                  maxLength={14}
                  autoFocus
                />
              </View>

              <PrimaryButton
                title="Send code"
                onPress={handleSendOtp}
                loading={loading}
                style={styles.submitBtn}
              />
            </View>
          ) : (
            /* STEP 2: OTP VERIFICATION */
            <View>
              <Text style={styles.sheetTitle}>Enter code</Text>
              <View style={styles.sentRow}>
                <Text style={styles.sheetSubtitleInline}>
                  Sent to <Text style={styles.phoneHighlight}>{phone}</Text>
                </Text>
                <Pressable onPress={handleChangeNumber} disabled={loading} hitSlop={8}>
                  <Text style={styles.link}>Edit</Text>
                </Pressable>
              </View>

              <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

              {/* Six visual cells driven by one hidden input */}
              <Pressable style={styles.otpRow} onPress={() => otpInputRef.current?.focus()}>
                {Array.from({ length: OTP_LENGTH }).map((_, i) => {
                  const char = otp[i] ?? '';
                  const isActive = otpFocused && i === Math.min(otp.length, OTP_LENGTH - 1);
                  return (
                    <View
                      key={i}
                      style={[
                        styles.otpCell,
                        char !== '' && styles.otpCellFilled,
                        isActive && styles.otpCellActive,
                      ]}
                    >
                      <Text style={styles.otpChar}>{char}</Text>
                    </View>
                  );
                })}
                <TextInput
                  ref={otpInputRef}
                  value={otp}
                  onChangeText={handleOtpChange}
                  onFocus={() => setOtpFocused(true)}
                  onBlur={() => setOtpFocused(false)}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="sms-otp"
                  maxLength={OTP_LENGTH}
                  editable={!loading}
                  autoFocus
                  style={styles.hiddenInput}
                  caretHidden
                />
              </Pressable>

              <View style={styles.devHintBox}>
                <Text style={styles.devHintTitle}>Dev mode</Text>
                <Text style={styles.devHintText}>
                  The code is printed in the backend terminal as [MOCK OTP].
                </Text>
              </View>

              <PrimaryButton
                title="Verify & continue"
                onPress={() => handleVerifyOtp()}
                loading={loading}
                disabled={otp.length !== OTP_LENGTH}
                style={styles.submitBtn}
              />

              <View style={styles.resendRow}>
                {canResend ? (
                  <Pressable onPress={handleResendOtp} disabled={loading}>
                    <Text style={styles.link}>Resend code</Text>
                  </Pressable>
                ) : (
                  <Text style={styles.countdownText}>
                    Resend code in 0:{String(countdown).padStart(2, '0')}
                  </Text>
                )}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const Feature: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.feature}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.ink,
  },
  scrollContent: {
    flexGrow: 1,
  },
  hero: {
    paddingHorizontal: spacing.xxl,
    paddingBottom: 56,
    overflow: 'hidden',
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
  },
  ringA: {
    width: 340,
    height: 340,
    top: -160,
    right: -140,
    backgroundColor: 'rgba(79, 70, 229, 0.35)',
  },
  ringB: {
    width: 180,
    height: 180,
    top: 120,
    right: -60,
    backgroundColor: 'rgba(52, 211, 153, 0.12)',
  },
  logoMark: {
    width: 52,
    height: 52,
    borderRadius: radius.lg,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  logoMarkText: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '800',
  },
  brand: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },
  tagline: {
    color: '#FFFFFF',
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  features: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: spacing.xl,
  },
  feature: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  featureIcon: {
    fontSize: 12,
    marginRight: 6,
  },
  featureText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  sheet: {
    flex: 1,
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    marginTop: -24,
    paddingHorizontal: spacing.xxl,
    paddingTop: spacing.xxl,
    ...shadow(3),
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -0.4,
  },
  sheetSubtitle: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 6,
    marginBottom: spacing.xl,
    lineHeight: 20,
  },
  sentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
    marginBottom: spacing.xl,
  },
  sheetSubtitleInline: {
    fontSize: 14,
    color: colors.textMuted,
  },
  phoneHighlight: {
    fontWeight: '700',
    color: colors.text,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  phoneField: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderRadius: radius.md,
    height: 56,
    overflow: 'hidden',
  },
  prefix: {
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 14,
    backgroundColor: colors.surfaceMuted,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  prefixText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    height: '100%',
    paddingHorizontal: 14,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    letterSpacing: 0.5,
  },
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: spacing.sm,
  },
  otpCell: {
    flex: 1,
    height: 58,
    maxWidth: 54,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCellFilled: {
    borderColor: colors.text,
    backgroundColor: colors.surfaceMuted,
  },
  otpCellActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  otpChar: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
  },
  hiddenInput: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0,
  },
  devHintBox: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.xl,
  },
  devHintTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  devHintText: {
    fontSize: 13,
    color: colors.primaryText,
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: spacing.xl,
  },
  resendRow: {
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  link: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 14,
  },
  countdownText: {
    color: colors.textFaint,
    fontSize: 14,
    fontWeight: '500',
  },
});
