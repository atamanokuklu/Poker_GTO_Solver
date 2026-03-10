import { StyleSheet, Text, View } from 'react-native';
import MetricBarChart from '@/components/MetricBarChart';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const StatsPanel = ({ userStats, levelInfo }) => {
  const accuracyData = Object.entries(userStats.accuracyByCategory).map(([key, value]) => ({
    category: key.toUpperCase(),
    accuracy: value.total ? Number(((value.correct / value.total) * 100).toFixed(1)) : 0,
  }));

  const weakestSpots = Object.entries(userStats.weakestSpots)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 4);

  const today = new Date();
  const calendarCells = Array.from({ length: 28 }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (27 - index));
    const key = date.toISOString().slice(0, 10);

    return {
      key,
      count: userStats.practiceCalendar[key] || 0,
    };
  });

  return (
    <View style={styles.wrapper}>
      <SectionCard>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Quiz Stats Dashboard</Text>
            <Text style={styles.subtitle}>Accuracy split by study lane and recent leak profile.</Text>
          </View>
          <View style={styles.levelChip}>
            <Text style={styles.levelLabel}>Level</Text>
            <Text style={styles.levelValue}>{levelInfo.label}</Text>
            <Text style={styles.levelXp}>{userStats.xp} XP</Text>
          </View>
        </View>

        <View style={styles.chartContainer}>
          <MetricBarChart
            data={accuracyData}
            labelKey="category"
            series={[{ key: 'accuracy', label: 'Accuracy', color: colors.accent }]}
            formatValue={(value) => `${value.toFixed(1)}%`}
          />
        </View>
      </SectionCard>

      <View style={styles.secondaryGrid}>
        <SectionCard style={styles.statCard}>
          <Text style={styles.eyebrow}>Practice Volume</Text>
          <Text style={styles.bigNumber}>{userStats.totalHandsReviewed}</Text>
          <Text style={styles.body}>Total hands reviewed across all quiz sessions.</Text>
        </SectionCard>

        <SectionCard style={styles.statCard}>
          <Text style={styles.eyebrow}>Weakest Spots</Text>
          <View style={styles.weakList}>
            {weakestSpots.length ? (
              weakestSpots.map(([spot, misses]) => (
                <Text key={spot} style={styles.weakItem}>
                  {spot} missed {misses}x
                </Text>
              ))
            ) : (
              <Text style={styles.body}>No weak spots recorded yet.</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard>
          <Text style={styles.eyebrow}>Streak Calendar</Text>
          <View style={styles.calendar}>
            {calendarCells.map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.calendarCell,
                  cell.count === 0
                    ? styles.calendarEmpty
                    : cell.count < 3
                      ? styles.calendarWarm
                      : cell.count < 6
                        ? styles.calendarHot
                        : styles.calendarPeak,
                ]}
              />
            ))}
          </View>
        </SectionCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    gap: spacing.md,
  },
  header: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
  title: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 26,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  levelChip: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.32)',
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: 92,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.sm,
  },
  levelLabel: {
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  levelValue: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 20,
    marginTop: spacing.xs,
  },
  levelXp: {
    color: colors.text,
    fontSize: 12,
  },
  chartContainer: {
    marginTop: spacing.md,
  },
  secondaryGrid: {
    gap: spacing.md,
  },
  statCard: {
    gap: spacing.sm,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1.8,
    textTransform: 'uppercase',
  },
  bigNumber: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 34,
  },
  body: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  weakList: {
    gap: spacing.xs,
  },
  weakItem: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  calendar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    rowGap: spacing.xs,
  },
  calendarCell: {
    aspectRatio: 1,
    borderRadius: radius.sm,
    borderWidth: 1,
    width: '13.3%',
  },
  calendarEmpty: {
    backgroundColor: colors.card,
    borderColor: colors.border,
  },
  calendarWarm: {
    backgroundColor: 'rgba(201, 168, 76, 0.2)',
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  calendarHot: {
    backgroundColor: 'rgba(46, 204, 113, 0.3)',
    borderColor: 'rgba(46, 204, 113, 0.35)',
  },
  calendarPeak: {
    backgroundColor: 'rgba(46, 204, 113, 0.6)',
    borderColor: 'rgba(46, 204, 113, 0.65)',
  },
});

export default StatsPanel;