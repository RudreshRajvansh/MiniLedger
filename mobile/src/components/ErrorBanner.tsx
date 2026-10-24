import React from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, spacing } from '../theme';

interface ErrorBannerProps {
  message: string | null;
  onDismiss?: () => void;
  onRetry?: () => void;
  style?: StyleProp<ViewStyle>;
}

export const ErrorBanner: React.FC<ErrorBannerProps> = ({
  message,
  onDismiss,
  onRetry,
  style,
}) => {
  if (!message) return null;

  return (
    <View style={[styles.container, style]} accessibilityRole="alert">
      <View style={styles.iconCircle}>
        <Text style={styles.icon}>!</Text>
      </View>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Pressable onPress={onRetry} style={styles.retryButton}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      )}
      {onDismiss && (
        <Pressable onPress={onDismiss} style={styles.dismissButton} hitSlop={8}>
          <Text style={styles.dismissText}>✕</Text>
        </Pressable>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.dangerBorder,
    borderRadius: radius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    marginVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  icon: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  message: {
    flex: 1,
    color: '#9F1239',
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  retryButton: {
    marginLeft: spacing.sm,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: colors.danger,
    borderRadius: 6,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  dismissButton: {
    marginLeft: spacing.sm,
    padding: 4,
  },
  dismissText: {
    color: '#9F1239',
    fontSize: 13,
    fontWeight: '700',
  },
});
