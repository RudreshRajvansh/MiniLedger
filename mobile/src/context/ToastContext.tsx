import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radius, shadow, spacing } from '../theme';

type ToastTone = 'success' | 'info' | 'danger';

interface ToastState {
  id: number;
  message: string;
  tone: ToastTone;
}

interface ToastContextType {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextType>({ showToast: () => {} });

const TONE_ICON: Record<ToastTone, { icon: string; bg: string }> = {
  success: { icon: '✓', bg: colors.success },
  info: { icon: 'i', bg: colors.primary },
  danger: { icon: '!', bg: colors.danger },
};

const USE_NATIVE_DRIVER = Platform.OS !== 'web';

/**
 * App-wide toast notifications. Lives above navigation so a toast triggered
 * just before navigating back (e.g. "Loan saved") stays visible on the next screen.
 */
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const anim = useRef(new Animated.Value(0)).current;
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((message: string, tone: ToastTone = 'success') => {
    setToast({ id: Date.now(), message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);

    anim.setValue(0);
    Animated.spring(anim, { toValue: 1, useNativeDriver: USE_NATIVE_DRIVER, friction: 8 }).start();

    hideTimer.current = setTimeout(() => {
      Animated.timing(anim, { toValue: 0, duration: 200, useNativeDriver: USE_NATIVE_DRIVER }).start(
        () => setToast(null),
      );
    }, 2600);

    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, [toast, anim]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {toast && (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.wrap,
            { top: insets.top + spacing.md },
            {
              opacity: anim,
              transform: [
                { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) },
              ],
            },
          ]}
        >
          <View style={styles.toast} accessibilityRole="alert">
            <View style={[styles.icon, { backgroundColor: TONE_ICON[toast.tone].bg }]}>
              <Text style={styles.iconText}>{TONE_ICON[toast.tone].icon}</Text>
            </View>
            <Text style={styles.message} numberOfLines={2}>
              {toast.message}
            </Text>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

export function useToast() {
  return useContext(ToastContext);
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.ink,
    borderRadius: radius.pill,
    paddingVertical: 10,
    paddingLeft: 10,
    paddingRight: 18,
    maxWidth: 380,
    ...shadow(3),
  },
  icon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  iconText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  message: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
