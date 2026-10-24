import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, radius, shadow, spacing } from '../theme';

export interface FilterOption<T extends string> {
  label: string;
  value: T;
  count?: number;
}

interface FilterTabsProps<T extends string> {
  options: FilterOption<T>[];
  value: T;
  onChange: (value: T) => void;
}

/**
 * Segmented control with an optional count badge per segment.
 */
export function FilterTabs<T extends string>({ options, value, onChange }: FilterTabsProps<T>) {
  return (
    <View style={styles.track}>
      {options.map((opt) => {
        const selected = opt.value === value;
        const isOverdue = opt.value === 'overdue';
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            style={[styles.segment, selected && styles.segmentActive]}
          >
            <Text style={[styles.label, selected && styles.labelActive]} numberOfLines={1}>
              {opt.label}
            </Text>
            {typeof opt.count === 'number' && opt.count > 0 && (
              <View
                style={[
                  styles.badge,
                  selected && styles.badgeActive,
                  isOverdue && styles.badgeDanger,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    selected && styles.badgeTextActive,
                    isOverdue && styles.badgeTextDanger,
                  ]}
                >
                  {opt.count}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: '#E9EBF2',
    borderRadius: radius.md,
    padding: 4,
    marginHorizontal: spacing.lg,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  segmentActive: {
    backgroundColor: colors.surface,
    ...shadow(1),
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textMuted,
  },
  labelActive: {
    color: colors.text,
    fontWeight: '700',
  },
  badge: {
    marginLeft: 5,
    minWidth: 18,
    paddingHorizontal: 5,
    height: 18,
    borderRadius: 9,
    backgroundColor: 'rgba(100,116,139,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeActive: {
    backgroundColor: colors.primarySoft,
  },
  badgeDanger: {
    backgroundColor: colors.danger,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.textMuted,
  },
  badgeTextActive: {
    color: colors.primaryText,
  },
  badgeTextDanger: {
    color: '#FFFFFF',
  },
});
