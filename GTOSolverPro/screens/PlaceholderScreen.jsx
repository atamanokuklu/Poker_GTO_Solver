import { StyleSheet, Text, View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const PlaceholderScreen = ({ icon, title, summary }) => (
  <ScreenContainer scrollable>
    <View style={styles.header}>
      <Text style={styles.eyebrow}>Native Port</Text>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{summary}</Text>
    </View>

    <SectionCard style={styles.heroCard}>
      <View style={styles.heroIconWrap}>
        <Feather color={colors.accent} name={icon} size={26} />
      </View>
      <Text style={styles.heroTitle}>Shell ready for migration</Text>
      <Text style={styles.heroBody}>This tab is wired into the Android app shell. The domain logic and shared context are in place, and this screen is ready for component-by-component React Native migration next.</Text>
    </SectionCard>
  </ScreenContainer>
);

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 34,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  heroCard: {
    alignItems: 'flex-start',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  heroIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.28)',
    borderRadius: radius.pill,
    borderWidth: 1,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  heroTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  heroBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
  },
});

export default PlaceholderScreen;