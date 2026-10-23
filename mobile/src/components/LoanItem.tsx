import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Loan } from '../api/loans.api';
import { formatCurrency } from '../utils/formatCurrency';
import { formatFriendlyDate } from '../utils/date';

interface LoanItemProps {
  loan: Loan;
  onRepay: (id: string) => void;
  onOpenReceipt: (url: string) => void;
  isRepaying?: boolean;
}

export const LoanItem: React.FC<LoanItemProps> = ({
  loan,
  onRepay,
  onOpenReceipt,
  isRepaying = false,
}) => {
  const isRepaid = loan.status === 'repaid';
  const isOverdue = loan.isOverdue;

  const handleRepayPress = () => {
    Alert.alert(
      'Mark as Repaid',
      `Confirm that ${loan.friendName} has repaid ${formatCurrency(loan.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Repayment',
          style: 'default',
          onPress: () => onRepay(loan.id),
        },
      ],
    );
  };

  return (
    <View
      style={[
        styles.card,
        isOverdue && styles.overdueCard,
        isRepaid && styles.repaidCard,
      ]}
    >
      {/* Top Header: Friend Name & Amount */}
      <View style={styles.topRow}>
        <View style={styles.nameContainer}>
          <Text style={[styles.friendName, isRepaid && styles.mutedText]}>
            {loan.friendName}
          </Text>
          <Text style={styles.dateLabel}>
            Due: {formatFriendlyDate(loan.dueDate)}
          </Text>
        </View>

        <Text
          style={[
            styles.amount,
            isOverdue && styles.overdueText,
            isRepaid && styles.repaidAmount,
          ]}
        >
          {formatCurrency(loan.amount)}
        </Text>
      </View>

      {/* Overdue Warning Banner */}
      {isOverdue && (
        <View style={styles.overdueBanner}>
          <Text style={styles.overdueBannerText}>
            ⚠️ Overdue by {loan.daysOverdue} {loan.daysOverdue === 1 ? 'day' : 'days'}
          </Text>
        </View>
      )}

      {/* Bottom Footer: Badges, Receipt Thumbnail, Repay Action */}
      <View style={styles.bottomRow}>
        <View style={styles.badgeGroup}>
          {isRepaid ? (
            <View style={styles.repaidBadge}>
              <Text style={styles.repaidBadgeText}>✓ Repaid</Text>
            </View>
          ) : isOverdue ? (
            <View style={styles.overdueBadge}>
              <Text style={styles.overdueBadgeText}>Overdue</Text>
            </View>
          ) : (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>Pending</Text>
            </View>
          )}

          {/* Receipt thumbnail button */}
          {loan.receiptUrl && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onOpenReceipt(loan.receiptUrl!)}
              style={styles.receiptButton}
            >
              <Image
                source={{ uri: loan.receiptUrl }}
                style={styles.receiptThumb}
              />
              <Text style={styles.receiptLabel}>Receipt</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Repay button on pending items */}
        {!isRepaid && (
          <TouchableOpacity
            style={[styles.repayButton, isRepaying && styles.disabledButton]}
            onPress={handleRepayPress}
            disabled={isRepaying}
          >
            <Text style={styles.repayButtonText}>
              {isRepaying ? 'Updating...' : 'Mark Repaid'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  overdueCard: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 5,
    borderLeftColor: '#EF4444', // Red left highlight
    borderColor: '#FECACA',
  },
  repaidCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    opacity: 0.85,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  nameContainer: {
    flex: 1,
  },
  friendName: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  dateLabel: {
    fontSize: 13,
    color: '#64748B',
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E293B',
    marginLeft: 8,
  },
  overdueText: {
    color: '#DC2626',
  },
  repaidAmount: {
    color: '#16A34A',
    textDecorationLine: 'none',
  },
  mutedText: {
    color: '#64748B',
  },
  overdueBanner: {
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  overdueBannerText: {
    color: '#B91C1C',
    fontSize: 12,
    fontWeight: '600',
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  badgeGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  pendingBadgeText: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: '600',
  },
  overdueBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  overdueBadgeText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  repaidBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  repaidBadgeText: {
    color: '#16A34A',
    fontSize: 12,
    fontWeight: '600',
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  receiptThumb: {
    width: 20,
    height: 20,
    borderRadius: 3,
    marginRight: 4,
  },
  receiptLabel: {
    fontSize: 11,
    color: '#475569',
    fontWeight: '500',
  },
  repayButton: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  disabledButton: {
    opacity: 0.6,
  },
  repayButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
});
