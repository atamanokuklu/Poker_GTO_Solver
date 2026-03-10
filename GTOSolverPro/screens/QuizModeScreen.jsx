import { Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Picker } from '@react-native-picker/picker';
import { Feather } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import SectionCard from '@/components/SectionCard';
import { useAppContext } from '@/context/AppContext';
import { quizQuestionCounts, QUIZ_TOPICS } from '@/data/quizQuestions';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const modeCards = [
  { id: 'preflop', label: 'Preflop Ranges', route: '/quiz/preflop', icon: 'grid' },
  { id: 'postflop', label: 'Postflop Decisions', route: '/quiz/postflop', icon: 'layers' },
  { id: 'math', label: 'Pot Odds & Math', route: '/quiz/math', icon: 'percent' },
];

const QuizModeScreen = () => {
  const router = useRouter();
  const { hydrated, quizSession, updateQuizSession, startQuizMode, resetQuizSession, userStats, levelInfo } = useAppContext();

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Quiz Module</Text>
        <Text style={styles.title}>Practice Lane</Text>
        <Text style={styles.subtitle}>Choose a study lane, tune the session, and launch directly into the native quiz flow.</Text>
      </View>

      <SectionCard>
        <Text style={styles.sectionTitle}>Session Settings</Text>

        <Text style={styles.label}>Difficulty</Text>
        <View style={styles.segmentRow}>
          {['Beginner', 'Intermediate', 'Advanced'].map((difficulty) => (
            <Pressable
              key={difficulty}
              onPress={() => updateQuizSession({ difficulty })}
              style={({ pressed }) => [styles.segmentButton, quizSession.difficulty === difficulty ? styles.segmentButtonActive : null, pressed ? styles.segmentButtonPressed : null]}
            >
              <Text style={[styles.segmentLabel, quizSession.difficulty === difficulty ? styles.segmentLabelActive : null]}>{difficulty}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Topics Filter</Text>
        <View style={styles.topicList}>
          {QUIZ_TOPICS.map((topic) => (
            <View key={topic.key} style={styles.topicRow}>
              <Text style={styles.topicLabel}>{topic.label}</Text>
              <Switch
                trackColor={{ false: colors.border, true: 'rgba(201, 168, 76, 0.5)' }}
                thumbColor={quizSession.topics[topic.key] ? colors.accent : colors.muted}
                value={quizSession.topics[topic.key]}
                onValueChange={(value) => updateQuizSession({ topics: { ...quizSession.topics, [topic.key]: value } })}
              />
            </View>
          ))}
        </View>

        <View style={styles.pickerGrid}>
          <View style={styles.pickerWrap}>
            <Text style={styles.label}>Timer</Text>
            <View style={styles.pickerShell}>
              <Picker dropdownIconColor={colors.accent} selectedValue={quizSession.timer} style={styles.picker} onValueChange={(value) => updateQuizSession({ timer: value })}>
                <Picker.Item label="10s" value={10} />
                <Picker.Item label="20s" value={20} />
                <Picker.Item label="30s" value={30} />
                <Picker.Item label="Off" value={0} />
              </Picker>
            </View>
          </View>

          <View style={styles.pickerWrap}>
            <Text style={styles.label}>Session Length</Text>
            <View style={styles.pickerShell}>
              <Picker dropdownIconColor={colors.accent} selectedValue={quizSession.sessionLength} style={styles.picker} onValueChange={(value) => updateQuizSession({ sessionLength: value })}>
                <Picker.Item label="5" value={5} />
                <Picker.Item label="10" value={10} />
                <Picker.Item label="20" value={20} />
                <Picker.Item label="Infinite" value="Infinite" />
              </Picker>
            </View>
          </View>
        </View>

        <Pressable onPress={resetQuizSession} style={({ pressed }) => [styles.resetButton, pressed ? styles.segmentButtonPressed : null]}>
          <Feather color={colors.text} name="rotate-ccw" size={16} />
          <Text style={styles.resetLabel}>Reset Session</Text>
        </Pressable>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Launch A Study Lane</Text>
        <View style={styles.modeList}>
          {modeCards.map((mode) => (
            <Pressable
              key={mode.id}
              onPress={() => {
                startQuizMode(mode.id);
                router.push(mode.route);
              }}
              style={({ pressed }) => [styles.modeCard, pressed ? styles.segmentButtonPressed : null]}
            >
              <View style={styles.modeIconWrap}>
                <Feather color={colors.accent} name={mode.icon} size={20} />
              </View>
              <View style={styles.modeCopy}>
                <Text style={styles.modeLabel}>{mode.label}</Text>
                <Text style={styles.modeMeta}>{quizQuestionCounts[mode.id]} spots ready in the current bank.</Text>
              </View>
              <Feather color={colors.muted} name="chevron-right" size={18} />
            </Pressable>
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <View style={styles.statsHeader}>
          <View>
            <Text style={styles.sectionTitle}>Live Summary</Text>
            <Text style={styles.statsSubtitle}>Hydration: {hydrated ? 'ready' : 'loading'}.</Text>
          </View>
          <Pressable onPress={() => router.push('/quiz/stats')} style={({ pressed }) => [styles.statsButton, pressed ? styles.segmentButtonPressed : null]}>
            <Text style={styles.statsButtonLabel}>Open Stats</Text>
          </Pressable>
        </View>

        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Level</Text>
            <Text style={styles.summaryValue}>{levelInfo.label}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>Hands Reviewed</Text>
            <Text style={styles.summaryValue}>{userStats.totalHandsReviewed}</Text>
          </View>
          <View style={styles.summaryCard}>
            <Text style={styles.summaryEyebrow}>XP</Text>
            <Text style={styles.summaryValue}>{userStats.xp}</Text>
          </View>
        </View>
      </SectionCard>
    </ScreenContainer>
  );
};

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
    fontSize: 36,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.heading,
    fontSize: 24,
    marginBottom: spacing.md,
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1.6,
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
    textTransform: 'uppercase',
  },
  segmentRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  segmentButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  segmentButtonActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.35)',
  },
  segmentButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  segmentLabel: {
    color: colors.text,
    fontSize: 14,
  },
  segmentLabelActive: {
    color: colors.accent,
  },
  topicList: {
    gap: spacing.sm,
  },
  topicRow: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  topicLabel: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    paddingRight: spacing.md,
  },
  pickerGrid: {
    gap: spacing.md,
    marginTop: spacing.sm,
  },
  pickerWrap: {
    flex: 1,
  },
  pickerShell: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
  },
  resetButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  resetLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  modeList: {
    gap: spacing.sm,
  },
  modeCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  modeIconWrap: {
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderRadius: radius.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  modeCopy: {
    flex: 1,
  },
  modeLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  modeMeta: {
    color: colors.muted,
    fontSize: 13,
    marginTop: spacing.xs,
  },
  statsHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  statsSubtitle: {
    color: colors.muted,
    fontSize: 13,
  },
  statsButton: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.35)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  statsButtonLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  summaryGrid: {
    gap: spacing.sm,
  },
  summaryCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  summaryEyebrow: {
    color: colors.muted,
    fontSize: 11,
    textTransform: 'uppercase',
  },
  summaryValue: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 28,
    marginTop: spacing.xs,
  },
});

export default QuizModeScreen;