// components/EmptyState.tsx
// Usage: <EmptyState icon="heart" title="No favourites yet" subtitle="..." action="Browse styles" onAction={() => {}} />

import { View, Text, StyleSheet, Pressable } from 'react-native';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import { Colors, Fonts } from '@/constants/theme';

const ICONS: Record<string, () => React.ReactNode> = {
  heart: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4}><Path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" /></Svg>,
  calendar: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Rect x="3" y="4" width="18" height="18" rx="2" /><Line x1="16" y1="2" x2="16" y2="6" /><Line x1="8" y1="2" x2="8" y2="6" /><Line x1="3" y1="10" x2="21" y2="10" /></Svg>,
  star: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4}><Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" /></Svg>,
  search: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Circle cx="11" cy="11" r="8" /><Path d="M21 21l-4.35-4.35" /></Svg>,
  wallet: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Rect x="2" y="5" width="20" height="14" rx="2" /><Path d="M2 10h20" /></Svg>,
  gift: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Rect x="3" y="8" width="18" height="4" rx="1" /><Path d="M12 8v13" /><Path d="M19 12v7a2 2 0 01-2 2H7a2 2 0 01-2-2v-7" /></Svg>,
  scissors: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Circle cx="6" cy="6" r="3" /><Circle cx="6" cy="18" r="3" /><Path d="M20 4L8.12 15.88" /><Path d="M14.47 14.48L20 20" /><Path d="M8.12 8.12L12 12" /></Svg>,
  camera: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><Circle cx="12" cy="13" r="4" /></Svg>,
  chat: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></Svg>,
  sparkle: () => <Svg width={32} height={32} viewBox="0 0 24 24" fill="none" stroke={Colors.lavender} strokeWidth={1.4} strokeLinecap="round"><Path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" /></Svg>,
};

type EmptyStateProps = {
  icon?: keyof typeof ICONS;
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
  secondaryAction?: string;
  onSecondaryAction?: () => void;
};

export default function EmptyState({
  icon = 'sparkle', title, subtitle, action, onAction, secondaryAction, onSecondaryAction,
}: EmptyStateProps) {
  const renderIcon = ICONS[icon] || ICONS.sparkle;

  return (
    <View style={st.container}>
      <View style={st.iconWrap}>{renderIcon()}</View>
      <Text style={st.title}>{title}</Text>
      {subtitle && <Text style={st.subtitle}>{subtitle}</Text>}
      {action && onAction && (
        <Pressable onPress={onAction} style={({ pressed }) => [st.btn, pressed && { opacity: 0.85 }]}>
          <Text style={st.btnText}>{action}</Text>
        </Pressable>
      )}
      {secondaryAction && onSecondaryAction && (
        <Pressable onPress={onSecondaryAction} style={st.secondaryBtn}>
          <Text style={st.secondaryBtnText}>{secondaryAction}</Text>
        </Pressable>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32 },
  iconWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: '#F7F5FB', alignItems: 'center', justifyContent: 'center',
    marginBottom: 18,
  },
  title: { fontFamily: Fonts.heading, fontSize: 18, color: Colors.ink, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontFamily: Fonts.body, fontSize: 13, color: Colors.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20, maxWidth: 260 },
  btn: {
    paddingVertical: 12, paddingHorizontal: 28,
    backgroundColor: Colors.violet, borderRadius: 14,
  },
  btnText: { fontFamily: Fonts.bodySemi, fontSize: 14, color: '#fff' },
  secondaryBtn: { marginTop: 12, paddingVertical: 8 },
  secondaryBtnText: { fontFamily: Fonts.bodySemi, fontSize: 13, color: Colors.violet },
});
