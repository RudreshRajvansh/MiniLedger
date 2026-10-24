import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { avatarPalette } from '../theme';

interface AvatarProps {
  name: string;
  size?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Same name always gets the same color, so a friend is recognisable at a glance.
// FNV-1a hash spreads similar names across the palette better than a simple sum.
function pickColor(name: string) {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return avatarPalette[(hash >>> 0) % avatarPalette.length];
}

export const Avatar: React.FC<AvatarProps> = ({ name, size = 44 }) => {
  const color = pickColor(name.trim().toLowerCase());

  return (
    <View
      style={[
        styles.circle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color.bg,
        },
      ]}
    >
      <Text style={[styles.initials, { color: color.fg, fontSize: size * 0.36 }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
