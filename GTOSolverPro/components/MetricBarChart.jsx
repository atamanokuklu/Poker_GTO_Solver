import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing } from '@/constants/theme';

const formatDefaultValue = (value) => `${Number(value || 0).toFixed(1)}`;

const MetricBarChart = ({ data = [], labelKey = 'label', series = [], formatValue = formatDefaultValue, emptyText = 'No chart data available.' }) => {
  const maxAbsValue = Math.max(
    1,
    ...data.flatMap((item) => series.map((entry) => Math.abs(Number(item?.[entry.key] || 0)))),
  );

  if (!data.length || !series.length) {
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyText}>{emptyText}</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartWrap}>
      {data.map((item) => (
        <View key={String(item[labelKey])} style={styles.groupCard}>
          <Text style={styles.groupLabel}>{item[labelKey]}</Text>
          <View style={styles.seriesStack}>
            {series.map((entry) => {
              const value = Number(item?.[entry.key] || 0);
              const widthPct = `${Math.max((Math.abs(value) / maxAbsValue) * 100, value === 0 ? 0 : 4)}%`;
              const fillColor = value < 0 ? colors.danger : entry.color;

              return (
                <View key={entry.key} style={styles.seriesBlock}>
                  <View style={styles.seriesHeader}>
                    <View style={styles.seriesMeta}>
                      <View style={[styles.legendSwatch, { backgroundColor: fillColor }]} />
                      <Text style={styles.seriesLabel}>{entry.label}</Text>
                    </View>
                    <Text style={styles.valueLabel}>{formatValue(value, entry, item)}</Text>
                  </View>
                  <View style={styles.track}>
                    <View style={[styles.trackInner, value < 0 ? styles.trackInnerNegative : null]}>
                      <View style={[styles.fill, { backgroundColor: fillColor, width: widthPct }]} />
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  chartWrap: {
    gap: spacing.sm,
  },
  groupCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  groupLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  seriesStack: {
    gap: spacing.sm,
  },
  seriesBlock: {
    gap: spacing.xs,
  },
  seriesHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  seriesMeta: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  legendSwatch: {
    borderRadius: radius.pill,
    height: 8,
    width: 8,
  },
  seriesLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  valueLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  trackInner: {
    justifyContent: 'flex-start',
    minHeight: 10,
  },
  trackInnerNegative: {
    justifyContent: 'flex-end',
  },
  fill: {
    borderRadius: radius.pill,
    minHeight: 10,
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

export default MetricBarChart;