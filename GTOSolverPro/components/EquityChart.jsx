import { StyleSheet, Text, View } from 'react-native';
import MetricBarChart from '@/components/MetricBarChart';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, spacing } from '@/constants/theme';

const EquityChart = ({ data = [] }) => {
  const hasData = data.length > 0;

  return (
    <SectionCard>
      <Text style={styles.title}>Equity Breakdown</Text>
      <Text style={styles.subtitle}>Made-hand frequency across the completed Monte Carlo samples.</Text>
      {hasData ? (
        <View style={styles.chartWrap}>
          <MetricBarChart
            data={data}
            labelKey="category"
            series={[
              { key: 'hero', label: 'Hero', color: colors.success },
              { key: 'villain', label: 'Villain', color: colors.accent },
            ]}
            formatValue={(value) => `${value.toFixed(1)}%`}
          />
          <View style={styles.legendRow}>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.success }]} />
              <Text style={styles.legendLabel}>Hero</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendSwatch, { backgroundColor: colors.accent }]} />
              <Text style={styles.legendLabel}>Villain</Text>
            </View>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Run a simulation to populate category frequencies.</Text>
        </View>
      )}
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  chartWrap: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  legendRow: {
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  legendItem: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendSwatch: {
    borderRadius: 999,
    height: 10,
    width: 10,
  },
  legendLabel: {
    color: colors.muted,
    fontSize: 12,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 180,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    textAlign: 'center',
  },
});

export default EquityChart;