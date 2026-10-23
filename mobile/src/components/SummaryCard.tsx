import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Summary } from '../api/loans.api';
import { formatCurrency } from '../utils/formatCurrency';

interface SummaryCardProps {
  summary: Summary | null;
  loading?: boolean;
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  const totalLent = summary?.totalLent ?? 0;
  const totalRepaid = summary?.totalRepaid ?? 0;
  const totalPending = summary?.totalPending ?? 0;
  const overdueAmount = summary?.overdueAmount ?? 0;
  const overdueCount = summary?.counts?.overdue ?? 0;

  return (
    <View style={styles.card}>
      <Text style={styles.headerTitle}>Financial Overview</Text>

      <View style={styles.grid}>
        {/* Total Lent */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Lent</Text>
          <Text style={styles.metricValue}>{formatCurrency(totalLent)}</Text>
        </View>

        {/* Total Repaid */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Total Repaid</Text>
          <Text style={[styles.metricValue, styles.repaidValue]}>
            {formatCurrency(totalRepaid)}
          </Text>
        </View>

        {/* Pending */}
        <View style={styles.metricItem}>
          <Text style={styles.metricLabel}>Pending</Text>
          <Text style={[styles.metricValue, styles.pendingValue]}>
            {formatCurrency(totalPending)}
          </Text>
        </View>

        {/* Overdue (Highlighted in red) */}
        <View style={[styles.metricItem, styles.overdueBox]}>
          <View style={styles.overdueHeader}>
            <Text style={[styles.metricLabel, styles.overdueLabel]}>
              Overdue
            </Text>
            {overdueCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{overdueCount}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.metricValue, styles.overdueValue]}>
            {formatCurrency(overdueAmount)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  metricItem: {
    width: '48%',
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    padding: 12,
  },
  metricLabel: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  repaidValue: {
    color: '#16A34A', // Green
  },
  pendingValue: {
    color: '#2563EB', // Blue
  },
  overdueBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
  },
  overdueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  overdueLabel: {
    color: '#DC2626',
    fontWeight: '600',
  },
  overdueValue: {
    color: '#DC2626', // Red
  },
  badge: {
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});
