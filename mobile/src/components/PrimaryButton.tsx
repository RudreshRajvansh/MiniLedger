import React from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  StyleProp,
} from 'react-native';
import { colors, radius } from '../theme';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'dark';
  size?: 'md' | 'sm';
  style?: StyleProp<ViewStyle>;
  textStyle?: TextStyle;
}

const VARIANTS = {
  primary: { bg: colors.primary, fg: '#FFFFFF' },
  secondary: { bg: colors.primarySoft, fg: colors.primaryText },
  danger: { bg: colors.danger, fg: '#FFFFFF' },
  success: { bg: colors.success, fg: '#FFFFFF' },
  dark: { bg: colors.ink, fg: '#FFFFFF' },
};

export const PrimaryButton: React.FC<PrimaryButtonProps> = ({
  title,
  onPress,
  loading = false,
  disabled = false,
  variant = 'primary',
  size = 'md',
  style,
  textStyle,
}) => {
  const isActionDisabled = disabled || loading;
  const palette = VARIANTS[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={isActionDisabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: isActionDisabled, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        size === 'sm' && styles.small,
        { backgroundColor: palette.bg },
        isActionDisabled && !loading && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={palette.fg} />
      ) : (
        <Text
          style={[
            styles.text,
            size === 'sm' && styles.smallText,
            { color: palette.fg },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    height: 52,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    flexDirection: 'row',
  },
  small: {
    height: 36,
    paddingHorizontal: 14,
    borderRadius: radius.sm,
  },
  disabled: {
    opacity: 0.45,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  text: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  smallText: {
    fontSize: 13,
  },
});
