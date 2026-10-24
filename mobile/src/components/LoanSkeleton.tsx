import React, { useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';
import { colors, radius, spacing } from '../theme';

/**
 * Pulsing placeholder cards shown while loans load, shaped like LoanItem
 * so the layout doesn't jump when real data arrives.
 */
export const LoanSkeleton: React.FC<{ count?: number }> = ({ count = 3 }) => {
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const useNativeDriver = Platform.OS !== 'web';
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View accessibilityLabel="Loading loans">
      {Array.from({ length: count }).map((_, i) => (
        <Animated.View key={i} style={[styles.card, { opacity: pulse }]}>
          <View style={styles.row}>
            <View style={styles.avatar} />
            <View style={styles.body}>
              <View style={[styles.bar, { width: '55%' }]} />
              <View style={[styles.bar, styles.barThin, { width: '35%' }]} />
            </View>
            <View style={styles.amountCol}>
              <View style={[styles.bar, { width: 64 }]} />
              <View style={[styles.bar, styles.barThin, { width: 52 }]} />
            </View>
          </View>
        </Animated.View>
      ))}
    </View>
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
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.border,
  },
  body: {
    flex: 1,
    marginLeft: spacing.md,
  },
  amountCol: {
    alignItems: 'flex-end',
  },
  bar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.border,
  },
  barThin: {
    height: 9,
    marginTop: 8,
  },
});
