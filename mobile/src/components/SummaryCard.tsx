import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Summary } from '../api/loans.api';
import { formatCurrency } from '../utils/formatCurrency';
import { colors, radius, shadow, spacing } from '../theme';

interface SummaryCardProps {
  summary: Summary | null;
}

/**
 * Dark "balance card" hero: outstanding amount up top, a recovery progress
 * bar, and the three supporting totals underneath.
 */
export const SummaryCard: React.FC<SummaryCardProps> = ({ summary }) => {
  const totalLent = summary?.totalLent ?? 0;
  const totalRepaid = summary?.totalRepaid ?? 0;
  const totalPending = summary?.totalPending ?? 0;
  const overdueAmount = summary?.overdueAmount ?? 0;
  const pendingCount = summary?.counts?.pending ?? 0;
  const overdueCount = summary?.counts?.overdue ?? 0;

  const recoveredPct = totalLent > 0 ? Math.round((totalRepaid / totalLent) * 100) : 0;

  return (
    <View style={styles.card}>
      {/* Decorative background rings */}
      <View style={[styles.ring, styles.ringLarge]} />
      <View style={[styles.ring, styles.ringSmall]} />

      <Text style={styles.eyebrow}>Outstanding with friends</Text>
      <Text style={styles.heroAmount} numberOfLines={1} adjustsFontSizeToFit>
        {formatCurrency(totalPending)}
      </Text>
      <Text style={styles.heroCaption}>
        across {pendingCount} open {pendingCount === 1 ? 'loan' : 'loans'}
      </Text>

      {/* Recovery progress */}
      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>Recovered</Text>
          <Text style={styles.progressValue}>{recoveredPct}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${recoveredPct}%` }]} />
        </View>
      </View>

      <View style={styles.statsRow}>
        <Stat label="Total lent" value={formatCurrency(totalLent)} />
        <View style={styles.divider} />
        <Stat label="Repaid" value={formatCurrency(totalRepaid)} tone="success" />
        <View style={styles.divider} />
        <Stat
          label={overdueCount > 0 ? `Overdue · ${overdueCount}` : 'Overdue'}
          value={formatCurrency(overdueAmount)}
          tone={overdueAmount > 0 ? 'danger' : undefined}
        />
      </View>
    </View>
  );
};

const Stat: React.FC<{ label: string; value: string; tone?: 'success' | 'danger' }> = ({
  label,
  value,
  tone,
}) => (
  <View style={styles.stat}>
    <View style={styles.statLabelRow}>
      {tone && (
        <View
          style={[
            styles.dot,
            { backgroundColor: tone === 'success' ? '#34D399' : '#FB7185' },
          ]}
        />
      )}
      <Text style={styles.statLabel} numberOfLines={1}>
        {label}
      </Text>
    </View>
    <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
      {value}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.ink,
    borderRadius: radius.xl,
    padding: spacing.xl,
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    overflow: 'hidden',
    ...shadow(3),
  },
  ring: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(129, 140, 248, 0.25)',
  },
  ringLarge: {
    width: 260,
    height: 260,
    top: -120,
    right: -90,
    backgroundColor: 'rgba(79, 70, 229, 0.22)',
  },
  ringSmall: {
    width: 140,
    height: 140,
    top: -30,
    right: -40,
    backgroundColor: 'rgba(129, 140, 248, 0.16)',
  },
  eyebrow: {
    color: colors.textOnDarkMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  heroAmount: {
    color: colors.textOnDark,
    fontSize: 38,
    fontWeight: '800',
    letterSpacing: -1,
    marginTop: 6,
    fontVariant: ['tabular-nums'],
  },
  heroCaption: {
    color: colors.textOnDarkMuted,
    fontSize: 13,
    marginTop: 2,
  },
  progressBlock: {
    marginTop: spacing.xl,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    color: colors.textOnDarkMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  progressValue: {
    color: colors.textOnDark,
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.12)',
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
    backgroundColor: '#34D399',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  stat: {
    flex: 1,
  },
  divider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    marginHorizontal: spacing.md,
  },
  statLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statLabel: {
    color: colors.textOnDarkMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  statValue: {
    color: colors.textOnDark,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
});
