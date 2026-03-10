import { StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const QuizCard = ({ title, subtitle, revealed, frontContent, backContent, statusLabel }) => {
  return (
    <View style={styles.shell}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Quiz Spot</Text>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        <View style={[styles.badge, revealed ? styles.badgeActive : null]}>
          <Text style={[styles.badgeLabel, revealed ? styles.badgeLabelActive : null]}>{revealed ? statusLabel || 'Answer Revealed' : 'Decision Pending'}</Text>
        </View>
      </View>

      <View style={styles.stage}>
        <View style={styles.face}>{revealed ? backContent : frontContent}</View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    overflow: 'hidden',
    padding: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headerCopy: {
    flex: 1,
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
    fontSize: 28,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: spacing.sm,
  },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  badgeActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.32)',
  },
  badgeLabel: {
    color: colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  badgeLabelActive: {
    color: colors.accent,
  },
  stage: {
    marginTop: spacing.md,
    minHeight: 320,
  },
  face: {
    minHeight: 1,
  },
});

export default QuizCard;