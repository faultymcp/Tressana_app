// components/primitives/Button.tsx
// Day 2 primitive. The single source of truth for the primary CTA.
// Replaces every inline Pressable + LinearGradient + styled label.
//
// Variants:
//   primary    — solid violet, white text. Default CTA across the app.
//   secondary  — porcelain background, ink text, subtle outline. Cancel,
//                "skip," secondary actions.
//   ghost      — text-only, no background. Inline links, dismiss actions.
//
// Sizes:
//   regular — 17 vertical padding, used in footers, full-width CTAs.
//   compact — 12 vertical padding, used inline, in sheets, secondary
//             positions.
//
// Accessibility:
//   - Touch target enforced at 44pt min via minHeight
//   - accessibilityRole prop defaults to 'button'
//   - accessibilityLabel falls back to label string

import { Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import {
  Accent,
  Foreground,
  BorderTone,
  Surface,
  Radius,
  Shadows,
  Motion,
  TouchTarget,
} from '@/constants/theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'regular' | 'compact';

type Props = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
};

export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'regular',
  disabled = false,
  fullWidth = true,
  accessibilityLabel,
}: Props) {
  const scale = useSharedValue(1);

  const onPressIn = () => {
    if (disabled) return;
    scale.value = withSpring(0.97, Motion.springTight);
  };
  const onPressOut = () => {
    if (disabled) return;
    scale.value = withSpring(1, Motion.springCalm);
  };

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const containerStyles = [
    s.base,
    size === 'compact' ? s.sizeCompact : s.sizeRegular,
    fullWidth && s.fullWidth,
    variant === 'primary'   && (disabled ? s.primaryDisabled : s.primary),
    variant === 'secondary' && s.secondary,
    variant === 'ghost'     && s.ghost,
  ];

  const labelStyles = [
    s.labelBase,
    size === 'compact' ? s.labelCompact : s.labelRegular,
    variant === 'primary'   && (disabled ? s.labelPrimaryDisabled : s.labelPrimary),
    variant === 'secondary' && s.labelSecondary,
    variant === 'ghost'     && s.labelGhost,
  ];

  // Ghost has no shadow. Primary has cta shadow when enabled.
  const shadowStyle =
    variant === 'primary' && !disabled ? Shadows.cta : undefined;

  return (
    <Animated.View style={[animStyle, shadowStyle, fullWidth && s.fullWidth]}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ disabled }}
        style={containerStyles}
      >
        <Text style={labelStyles}>{label}</Text>
      </Pressable>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  base: {
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: TouchTarget.min,
  },
  fullWidth: { width: '100%' },

  sizeRegular: { paddingVertical: 17, paddingHorizontal: 24 },
  sizeCompact: { paddingVertical: 12, paddingHorizontal: 16 },

  primary: {
    backgroundColor: Accent.base,
  },
  primaryDisabled: {
    backgroundColor: '#E0DCD5',
  },
  secondary: {
    backgroundColor: Surface.raised,
    borderWidth: 1.5,
    borderColor: BorderTone.base,
  },
  ghost: {
    backgroundColor: 'transparent',
  },

  labelBase: {
    fontFamily: 'Sora_600SemiBold',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  labelRegular: { fontSize: 15 },
  labelCompact: { fontSize: 14 },

  labelPrimary: { color: Foreground.onAccent },
  labelPrimaryDisabled: { color: '#9D9686' },
  labelSecondary: { color: Foreground.primary },
  labelGhost: { color: Accent.base },
});
