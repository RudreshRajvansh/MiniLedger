import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import { requestOtp, verifyOtp } from '../api/auth.api';
import { getErrorMessage } from '../api/client';
import { PrimaryButton } from '../components/PrimaryButton';
import { ErrorBanner } from '../components/ErrorBanner';

export const LoginScreen: React.FC = () => {
  const { login } = useAuth();

  // Step 1: 'phone' | Step 2: 'otp'
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 30-second countdown for Resend OTP
  const [countdown, setCountdown] = useState(30);
  const [canResend, setCanResend] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
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

  const handleVerifyOtp = async () => {
    setErrorMessage(null);
    const cleanedOtp = otp.trim();

    if (cleanedOtp.length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const data = await verifyOtp(phone.trim(), cleanedOtp);
      await login(data.token, data.user);
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      await requestOtp(phone.trim());
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
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.logo}>📒 MiniLedger</Text>
          <Text style={styles.subtitle}>
            Track money lent to friends with zero hassle
          </Text>

          <ErrorBanner
            message={errorMessage}
            onDismiss={() => setErrorMessage(null)}
          />

          {step === 'phone' ? (
            /* STEP 1: PHONE INPUT */
            <View style={styles.stepContainer}>
              <Text style={styles.label}>Mobile Phone Number</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 9876543210 or +91..."
                keyboardType="phone-pad"
                value={phone}
                onChangeText={setPhone}
                editable={!loading}
                autoFocus
              />

              <Text style={styles.helperText}>
                Accepts 10-digit Indian numbers (with or without +91)
              </Text>

              <PrimaryButton
                title="Send OTP"
                onPress={handleSendOtp}
                loading={loading}
                style={styles.submitBtn}
              />
            </View>
          ) : (
            /* STEP 2: OTP VERIFICATION */
            <View style={styles.stepContainer}>
              <View style={styles.phoneReviewRow}>
                <Text style={styles.sendingToText}>
                  OTP sent to <Text style={styles.phoneHighlight}>{phone}</Text>
                </Text>
                <TouchableOpacity onPress={handleChangeNumber} disabled={loading}>
                  <Text style={styles.changePhoneText}>Change</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>Enter 6-Digit OTP</Text>
              <TextInput
                style={[styles.input, styles.otpInput]}
                placeholder="• • • • • •"
                keyboardType="number-pad"
                maxLength={6}
                value={otp}
                onChangeText={setOtp}
                editable={!loading}
                autoFocus
              />

              <View style={styles.devHintBox}>
                <Text style={styles.devHintText}>
                  💡 Dev Mode: Look at your backend terminal console to find your OTP code.
                </Text>
              </View>

              <PrimaryButton
                title="Verify & Log In"
                onPress={handleVerifyOtp}
                loading={loading}
                style={styles.submitBtn}
              />

              <View style={styles.resendRow}>
                {canResend ? (
                  <TouchableOpacity onPress={handleResendOtp} disabled={loading}>
                    <Text style={styles.resendLink}>Resend OTP</Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.countdownText}>
                    Resend OTP in {countdown}s
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  logo: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 20,
  },
  stepContainer: {
    marginTop: 8,
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
  otpInput: {
    letterSpacing: 8,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '700',
  },
  helperText: {
    fontSize: 12,
    color: '#94A3B8',
    marginTop: 6,
    marginBottom: 16,
  },
  phoneReviewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sendingToText: {
    fontSize: 14,
    color: '#475569',
  },
  phoneHighlight: {
    fontWeight: '700',
    color: '#0F172A',
  },
  changePhoneText: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 13,
  },
  devHintBox: {
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
    padding: 12,
    marginTop: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  devHintText: {
    fontSize: 13,
    color: '#1E40AF',
    lineHeight: 18,
  },
  submitBtn: {
    marginTop: 8,
  },
  resendRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  resendLink: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  countdownText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
