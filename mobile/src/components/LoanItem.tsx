import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Image, Animated, Platform } from 'react-native';
import { Loan } from '../api/loans.api';
import { formatCurrency } from '../utils/formatCurrency';
import { describeDueIn, formatTimestamp } from '../utils/date';
import { confirmAction } from '../utils/confirm';
import { shareReminder } from '../utils/reminder';
import { Avatar } from './Avatar';
import { colors, radius, shadow, spacing } from '../theme';

interface LoanItemProps {
  loan: Loan;
  onRepay: (id: string) => void;
  onOpenReceipt: (url: string) => void;
  onPress?: (loan: Loan) => void;
  isRepaying?: boolean;
  /** Position in the list; used to stagger the entrance animation */
  index?: number;
}

export const LoanItem: React.FC<LoanItemProps> = ({
  loan,
  onRepay,
  onOpenReceipt,
  onPress,
  isRepaying = false,
  index = 0,
}) => {
  // Fade + slide up on mount, staggered by list position (capped so long lists stay snappy)
  const appear = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(appear, {
      toValue: 1,
      duration: 320,
      delay: Math.min(index, 8) * 45,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [appear, index]);

  const isRepaid = loan.status === 'repaid';
  const isOverdue = loan.isOverdue;

  const handleRepayPress = () => {
    confirmAction(
      'Mark as repaid',
      `Confirm that ${loan.friendName} has repaid ${formatCurrency(loan.amount)}?`,
      'Confirm',
      () => onRepay(loan.id),
    );
  };

  const status = isRepaid
    ? { label: 'Repaid', fg: colors.success, bg: colors.successSoft }
    : isOverdue
      ? { label: 'Overdue', fg: colors.danger, bg: colors.dangerSoft }
      : { label: 'Pending', fg: colors.warning, bg: colors.warningSoft };

  const subline = isRepaid
    ? loan.repaidAt
      ? `Repaid on ${formatTimestamp(loan.repaidAt)}`
      : 'Repaid'
    : isOverdue
      ? `Overdue by ${loan.daysOverdue} ${loan.daysOverdue === 1 ? 'day' : 'days'}`
      : describeDueIn(loan.dueDate);

  return (
    <Animated.View
      style={{
        opacity: appear,
        transform: [{ translateY: appear.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      <Pressable
        onPress={() => onPress?.(loan)}
        accessibilityRole="button"
        accessibilityLabel={`${loan.friendName}, ${formatCurrency(loan.amount)}, ${status.label}`}
        style={({ pressed }) => [
          styles.card,
          isOverdue && styles.overdueCard,
          pressed && styles.cardPressed,
        ]}
      >
        {isOverdue && <View style={styles.overdueStripe} />}

        <View style={styles.row}>
          <Avatar name={loan.friendName} />

          <View style={styles.body}>
            <Text style={styles.friendName} numberOfLines={1}>
              {loan.friendName}
            </Text>
            <Text
              style={[
                styles.subline,
                isOverdue && { color: colors.danger, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {subline}
            </Text>
          </View>

          <View style={styles.amountCol}>
            <Text
              style={[
                styles.amount,
                isRepaid && styles.repaidAmount,
                isOverdue && { color: colors.danger },
              ]}
            >
              {formatCurrency(loan.amount)}
            </Text>
            <View style={[styles.pill, { backgroundColor: status.bg }]}>
              <View style={[styles.pillDot, { backgroundColor: status.fg }]} />
              <Text style={[styles.pillText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
        </View>

        {(!isRepaid || loan.receiptUrl) && (
          <View style={styles.footer}>
            {loan.receiptUrl ? (
              <Pressable
                onPress={() => onOpenReceipt(loan.receiptUrl!)}
                style={({ pressed }) => [styles.receiptChip, pressed && { opacity: 0.7 }]}
              >
                <Image source={{ uri: loan.receiptUrl }} style={styles.receiptThumb} />
                <Text style={styles.receiptLabel}>View receipt</Text>
              </Pressable>
            ) : (
              <Text style={styles.footerHint}>Added {formatTimestamp(loan.createdAt)}</Text>
            )}

            {!isRepaid && (
              <View style={styles.actions}>
                <Pressable
                  onPress={() => shareReminder(loan)}
                  style={({ pressed }) => [styles.remindButton, pressed && { opacity: 0.7 }]}
                  accessibilityLabel={`Send reminder to ${loan.friendName}`}
                >
                  <Text style={styles.remindButtonText}>Remind</Text>
                </Pressable>
                <Pressable
                  onPress={handleRepayPress}
                  disabled={isRepaying}
                  style={({ pressed }) => [
                    styles.repayButton,
                    (pressed || isRepaying) && { opacity: 0.7 },
                  ]}
                >
                  <Text style={styles.repayButtonText}>
                    {isRepaying ? 'Updating…' : '✓  Repaid'}
                  </Text>
                </Pressable>
              </View>
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    ...shadow(1),
  },
  cardPressed: {
    backgroundColor: colors.surfaceMuted,
  },
  overdueCard: {
    borderColor: colors.dangerBorder,
  },
  overdueStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.danger,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
    marginRight: spacing.sm,
  },
  friendName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subline: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 3,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  repaidAmount: {
    color: colors.textFaint,
    textDecorationLine: 'line-through',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.pill,
    marginTop: 6,
  },
  pillDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 5,
  },
  pillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerHint: {
    fontSize: 12,
    color: colors.textMuted,
  },
  receiptChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    paddingRight: 10,
    paddingLeft: 4,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  receiptThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    marginRight: 6,
    backgroundColor: colors.border,
  },
  receiptLabel: {
    fontSize: 12,
    color: colors.text,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  remindButton: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  remindButtonText: {
    color: colors.primaryText,
    fontSize: 13,
    fontWeight: '700',
  },
  repayButton: {
    backgroundColor: colors.successSoft,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  repayButtonText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '700',
  },
});
