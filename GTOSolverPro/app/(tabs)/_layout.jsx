import { Tabs } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors } from '@/constants/theme';

const iconMap = {
  'range-builder': 'grid',
  'gto-solver': 'cpu',
  'equity-calc': 'percent',
  'hand-history': 'clock',
  quiz: 'help-circle',
};

const createOptions = (title, name) => ({
  title,
  headerShown: false,
  tabBarActiveTintColor: colors.accent,
  tabBarInactiveTintColor: colors.muted,
  tabBarStyle: {
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
  },
  tabBarIcon: ({ color, size }) => <Feather color={color} name={iconMap[name]} size={size} />,
});

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ sceneStyle: { backgroundColor: colors.bg } }}>
      <Tabs.Screen name="range-builder" options={createOptions('Range Builder', 'range-builder')} listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined) }} />
      <Tabs.Screen name="gto-solver" options={createOptions('GTO Solver', 'gto-solver')} listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined) }} />
      <Tabs.Screen name="equity-calc" options={createOptions('Equity Calc', 'equity-calc')} listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined) }} />
      <Tabs.Screen name="hand-history" options={createOptions('Hand History', 'hand-history')} listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined) }} />
      <Tabs.Screen name="quiz" options={createOptions('Quiz', 'quiz')} listeners={{ tabPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => undefined) }} />
    </Tabs>
  );
}