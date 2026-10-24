import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { RouteProp, useFocusEffect, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteLoan, getLoanById, repayLoan, uploadReceipt, Loan } from '../api/loans.api';
import { getErrorMessage } from '../api/client';
import { Avatar } from '../components/Avatar';
import { PrimaryButton } from '../components/PrimaryButton';
import { ErrorBanner } from '../components/ErrorBanner';
import { useToast } from '../context/ToastContext';
import { formatCurrency } from '../utils/formatCurrency';
import { daysUntil, describeDueIn, formatFriendlyDate, formatTimestamp } from '../utils/date';
import { confirmAction } from '../utils/confirm';
import { pickReceiptImage } from '../utils/pickImage';
import { shareReminder } from '../utils/reminder';
import { colors, radius, shadow, spacing } from '../theme';
import type { RootStackParamList } from '../../App';

type StepState = 'done' | 'current' | 'late' | 'upcoming';

interface TimelineStep {
  title: string;
  caption: string;
  state: StepState;
}

function relativeDays(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  return `in ${days} days`;
}

function buildTimeline(loan: Loan): TimelineStep[] {
  const isRepaid = loan.status === 'repaid';
  return [
    {
      // createdAt is when the entry was logged, which may be after the money changed hands
      title: `Added ${formatCurrency(loan.amount)} to ledger`,
      caption: formatTimestamp(loan.createdAt),
      state: 'done',
    },
    {
      title: loan.isOverdue ? 'Missed due date' : 'Due date',
      caption: loan.isOverdue
        ? `${formatFriendlyDate(loan.dueDate)} · ${loan.daysOverdue} ${loan.daysOverdue === 1 ? 'day' : 'days'} ago`
        : isRepaid
          ? formatFriendlyDate(loan.dueDate)
          : `${formatFriendlyDate(loan.dueDate)} · ${relativeDays(daysUntil(loan.dueDate))}`,
      state: isRepaid ? 'done' : loan.isOverdue ? 'late' : 'current',
    },
    {
      title: isRepaid ? 'Repaid in full' : 'Awaiting repayment',
      caption: isRepaid && loan.repaidAt ? formatTimestamp(loan.repaidAt) : 'Not yet',
      state: isRepaid ? 'done' : 'upcoming',
    },
  ];
}

const STEP_COLORS: Record<StepState, { dot: string; ring: string }> = {
  done: { dot: colors.success, ring: colors.successSoft },
  current: { dot: colors.warning, ring: colors.warningSoft },
  late: { dot: colors.danger, ring: colors.dangerSoft },
  upcoming: { dot: colors.borderStrong, ring: colors.surfaceMuted },
};

export const LoanDetailScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<RouteProp<RootStackParamList, 'LoanDetail'>>();
  const insets = useSafeAreaInsets();
  const { showToast } = useToast();
  const { loanId } = route.params;

  const [loan, setLoan] = useState<Loan | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<null | 'repay' | 'receipt' | 'delete'>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  const load = useCallback(async () => {
    setErrorMessage(null);
    try {
      setLoan(await getLoanById(loanId));
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [loanId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const handleRepay = () => {
    if (!loan) return;
    confirmAction(
      'Mark as repaid',
      `Confirm that ${loan.friendName} has repaid ${formatCurrency(loan.amount)}?`,
      'Confirm',
      async () => {
        setBusy('repay');
        try {
          setLoan(await repayLoan(loan.id));
          showToast(`${formatCurrency(loan.amount)} from ${loan.friendName.split(' ')[0]} settled`);
        } catch (err) {
          setErrorMessage(getErrorMessage(err));
        } finally {
          setBusy(null);
        }
      },
    );
  };

  const handleAttachReceipt = async () => {
    if (!loan) return;
    const uri = await pickReceiptImage();
    if (!uri) return;
    setBusy('receipt');
    try {
      setLoan(await uploadReceipt(loan.id, uri));
      showToast('Receipt attached');
    } catch (err) {
      setErrorMessage(getErrorMessage(err));
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = () => {
    if (!loan) return;
    confirmAction(
      'Delete this entry?',
      `The ${formatCurrency(loan.amount)} loan to ${loan.friendName} will be removed permanently.`,
      'Delete',
      async () => {
        setBusy('delete');
        try {
          await deleteLoan(loan.id);
          showToast('Entry deleted', 'info');
          navigation.goBack();
        } catch (err) {
          setErrorMessage(getErrorMessage(err));
          setBusy(null);
        }
      },
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!loan) {
    return (
      <View style={[styles.centered, { padding: spacing.xl }]}>
        <ErrorBanner message={errorMessage ?? 'Loan not found'} onRetry={load} />
      </View>
    );
  }

  const isRepaid = loan.status === 'repaid';
  const status = isRepaid
    ? { label: 'Repaid', fg: colors.success, bg: colors.successSoft }
    : loan.isOverdue
      ? { label: `Overdue · ${loan.daysOverdue}d`, fg: colors.danger, bg: colors.dangerSoft }
      : { label: describeDueIn(loan.dueDate), fg: colors.warning, bg: colors.warningSoft };

  const timeline = buildTimeline(loan);

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <ErrorBanner message={errorMessage} onDismiss={() => setErrorMessage(null)} />

        {/* Hero */}
        <View style={styles.hero}>
          <Avatar name={loan.friendName} size={64} />
          <Text style={styles.name}>{loan.friendName}</Text>
          <Text style={[styles.amount, isRepaid && styles.amountRepaid]}>
            {formatCurrency(loan.amount)}
          </Text>
          <View style={[styles.statusPill, { backgroundColor: status.bg }]}>
            <View style={[styles.statusDot, { backgroundColor: status.fg }]} />
            <Text style={[styles.statusText, { color: status.fg }]}>{status.label}</Text>
          </View>
        </View>

        {/* Timeline */}
        <Text style={styles.sectionTitle}>Timeline</Text>
        <View style={styles.card}>
          {timeline.map((step, i) => {
            const c = STEP_COLORS[step.state];
            const isLast = i === timeline.length - 1;
            return (
              <View key={step.title} style={styles.step}>
                <View style={styles.stepRail}>
                  <View style={[styles.stepRing, { backgroundColor: c.ring }]}>
                    <View style={[styles.stepDot, { backgroundColor: c.dot }]} />
                  </View>
                  {!isLast && (
                    <View
                      style={[
                        styles.stepLine,
                        step.state === 'done' && { backgroundColor: colors.success },
                      ]}
                    />
                  )}
                </View>
                <View style={[styles.stepBody, !isLast && { paddingBottom: spacing.xl }]}>
                  <Text
                    style={[
                      styles.stepTitle,
                      step.state === 'upcoming' && { color: colors.textFaint },
                      step.state === 'late' && { color: colors.danger },
                    ]}
                  >
                    {step.title}
                  </Text>
                  <Text style={styles.stepCaption}>{step.caption}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Receipt */}
        <Text style={styles.sectionTitle}>Receipt</Text>
        {loan.receiptUrl ? (
          <Pressable
            onPress={() => setReceiptOpen(true)}
            style={({ pressed }) => [styles.receiptCard, pressed && { opacity: 0.85 }]}
          >
            <Image source={{ uri: loan.receiptUrl }} style={styles.receiptImage} resizeMode="cover" />
            <View style={styles.receiptOverlay}>
              <Text style={styles.receiptOverlayText}>Tap to view full size</Text>
            </View>
          </Pressable>
        ) : (
          <Pressable
            onPress={handleAttachReceipt}
            disabled={busy !== null}
            style={({ pressed }) => [styles.attach, pressed && { opacity: 0.7 }]}
          >
            {busy === 'receipt' ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <>
                <Text style={styles.attachIcon}>📷</Text>
                <Text style={styles.attachTitle}>Attach a receipt</Text>
                <Text style={styles.attachSub}>Proof of payment keeps everyone honest</Text>
              </>
            )}
          </Pressable>
        )}

        <Pressable
          onPress={handleDelete}
          disabled={busy !== null}
          style={({ pressed }) => [styles.deleteBtn, pressed && { opacity: 0.6 }]}
        >
          {busy === 'delete' ? (
            <ActivityIndicator color={colors.danger} />
          ) : (
            <Text style={styles.deleteText}>Delete entry</Text>
          )}
        </Pressable>
      </ScrollView>

      {/* Sticky actions for open loans */}
      {!isRepaid && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + spacing.lg }]}>
          <PrimaryButton
            title="Remind"
            variant="secondary"
            onPress={() => shareReminder(loan)}
            disabled={busy !== null}
            style={styles.footerBtnSmall}
          />
          <PrimaryButton
            title="Mark as repaid"
            variant="success"
            onPress={handleRepay}
            loading={busy === 'repay'}
            disabled={busy !== null}
            style={styles.footerBtnLarge}
          />
        </View>
      )}

      {/* Full-size receipt */}
      <Modal visible={receiptOpen} transparent animationType="fade" onRequestClose={() => setReceiptOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setReceiptOpen(false)}>
          {loan.receiptUrl && (
            <Image source={{ uri: loan.receiptUrl }} style={styles.modalImage} resizeMode="contain" />
          )}
          <Text style={styles.modalHint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: 40,
  },
  hero: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadow(2),
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.md,
  },
  amount: {
    fontSize: 40,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
    marginTop: 4,
    fontVariant: ['tabular-nums'],
  },
  amountRepaid: {
    color: colors.success,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    marginTop: spacing.md,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: spacing.xxl,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  step: {
    flexDirection: 'row',
  },
  stepRail: {
    alignItems: 'center',
    width: 24,
    marginRight: spacing.md,
  },
  stepRing: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stepLine: {
    flex: 1,
    width: 2,
    backgroundColor: colors.border,
    marginVertical: 2,
  },
  stepBody: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    lineHeight: 22,
  },
  stepCaption: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  receiptCard: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  receiptImage: {
    width: '100%',
    height: 220,
  },
  receiptOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 10,
    backgroundColor: 'rgba(11,18,32,0.6)',
    alignItems: 'center',
  },
  receiptOverlayText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  attach: {
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    paddingVertical: spacing.xl,
    alignItems: 'center',
    backgroundColor: colors.surface,
    minHeight: 110,
    justifyContent: 'center',
  },
  attachIcon: {
    fontSize: 24,
    marginBottom: 6,
  },
  attachTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  attachSub: {
    fontSize: 12,
    color: colors.textFaint,
    marginTop: 2,
  },
  deleteBtn: {
    alignSelf: 'center',
    marginTop: spacing.xxl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerBtnSmall: {
    flex: 1,
  },
  footerBtnLarge: {
    flex: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(11, 18, 32, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  modalImage: {
    width: '100%',
    maxWidth: 480,
    height: '80%',
  },
  modalHint: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 13,
    marginTop: spacing.lg,
  },
});
