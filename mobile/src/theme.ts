import { Platform, ViewStyle } from 'react-native';

/**
 * Design tokens for MiniLedger.
 * Every screen and component pulls colors, spacing and radii from here
 * so the whole app stays visually consistent.
 */
export const colors = {
  // Brand
  ink: '#0B1220',
  inkSoft: '#1A2335',
  primary: '#4F46E5',
  primarySoft: '#EEF2FF',
  primaryText: '#3730A3',

  // Surfaces
  bg: '#F4F5F9',
  surface: '#FFFFFF',
  surfaceMuted: '#F8FAFC',
  border: '#E6E8EF',
  borderStrong: '#CDD2DE',

  // Text
  text: '#0F172A',
  textMuted: '#64748B',
  textFaint: '#94A3B8',
  textOnDark: '#FFFFFF',
  textOnDarkMuted: 'rgba(255,255,255,0.62)',

  // Status
  success: '#059669',
  successSoft: '#ECFDF5',
  warning: '#D97706',
  warningSoft: '#FFFBEB',
  danger: '#E11D48',
  dangerSoft: '#FFF1F2',
  dangerBorder: '#FECDD3',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

/**
 * Cross-platform soft shadow. Uses boxShadow on web (shadow* props are
 * deprecated there) and native shadow/elevation on iOS/Android.
 */
export function shadow(level: 1 | 2 | 3 = 1): ViewStyle {
  const config = {
    1: { y: 1, blur: 3, opacity: 0.06, elevation: 1 },
    2: { y: 4, blur: 14, opacity: 0.08, elevation: 4 },
    3: { y: 10, blur: 30, opacity: 0.18, elevation: 10 },
  }[level];

  if (Platform.OS === 'web') {
    return {
      // @ts-expect-error boxShadow is supported by react-native-web
      boxShadow: `0px ${config.y}px ${config.blur}px rgba(15, 23, 42, ${config.opacity})`,
    };
  }

  return {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: config.y },
    shadowOpacity: config.opacity,
    shadowRadius: config.blur / 2,
    elevation: config.elevation,
  };
}

// Palette for friend avatars; picked deterministically from the name
export const avatarPalette = [
  { bg: '#EEF2FF', fg: '#4338CA' },
  { bg: '#ECFDF5', fg: '#047857' },
  { bg: '#FFF7ED', fg: '#C2410C' },
  { bg: '#FDF2F8', fg: '#BE185D' },
  { bg: '#F0F9FF', fg: '#0369A1' },
  { bg: '#F5F3FF', fg: '#6D28D9' },
  { bg: '#FEFCE8', fg: '#A16207' },
];
