import { useMemo, useState } from 'react';
import { Pressable, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import HandGrid from '@/components/HandGrid';
import ScreenContainer from '@/components/ScreenContainer';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAppContext } from '@/context/AppContext';
import { ALL_HANDS, POSITIONS, SCENARIOS, applyTightnessToRange, getDefaultRange, getRangeKey, parseRangeText, serializeRange } from '@/data/gtoRanges';

const cycleProfile = (profile) => {
  const raise = profile?.raise || 0;
  const call = profile?.call || 0;

  if (raise >= 0.99 && call <= 0.01) {
    return { raise: 0, call: 1, fold: 0 };
  }

  if (call >= 0.99) {
    return { raise: 0.5, call: 0.5, fold: 0 };
  }

  if (raise > 0.1 && call > 0.1) {
    return { raise: 0, call: 0, fold: 1 };
  }

  return { raise: 1, call: 0, fold: 0 };
};

const summaryStats = (range) => {
  const counts = ALL_HANDS.reduce(
    (accumulator, handLabel) => {
      const action = range[handLabel] || { raise: 0, call: 0, fold: 1 };
      accumulator.raise += action.raise;
      accumulator.call += action.call;
      accumulator.fold += action.fold ?? 1;
      accumulator.mixed += action.raise > 0.01 && action.call > 0.01 ? 1 : 0;
      accumulator.included += action.raise + action.call > 0.01 ? 1 : 0;
      return accumulator;
    },
    { raise: 0, call: 0, fold: 0, mixed: 0, included: 0 },
  );

  return {
    openRate: ((counts.included / ALL_HANDS.length) * 100).toFixed(1),
    raiseWeight: ((counts.raise / ALL_HANDS.length) * 100).toFixed(1),
    callWeight: ((counts.call / ALL_HANDS.length) * 100).toFixed(1),
    mixedCells: counts.mixed,
  };
};

const tightnessSteps = [40, 55, 68, 80, 92, 100];

const RangeBuilderScreen = () => {
  const { rangeState, updateRangeState, setRangeOverride, replaceRangeOverrides, resetRangeOverrides, pushToast } = useAppContext();
  const [importText, setImportText] = useState('');
  const rangeKey = getRangeKey(rangeState.position, rangeState.scenario);
  const baseRange = getDefaultRange(rangeState.position, rangeState.scenario);
  const mergedRange = useMemo(() => ({ ...baseRange, ...(rangeState.overrides[rangeKey] || {}) }), [baseRange, rangeKey, rangeState.overrides]);
  const displayRange = useMemo(() => applyTightnessToRange(mergedRange, rangeState.tightness), [mergedRange, rangeState.tightness]);
  const stats = summaryStats(displayRange);

  const handleExport = async () => {
    const text = serializeRange(displayRange);
    await Share.share({ message: text, title: `${rangeState.position} ${rangeState.scenario} range` });
    pushToast('Range export sheet opened.', 'success');
  };

  const handleImport = () => {
    const labels = parseRangeText(importText);

    if (!labels.length) {
      pushToast('No valid hands found in the import string.', 'error');
      return;
    }

    const importedRange = ALL_HANDS.reduce((accumulator, handLabel) => {
      accumulator[handLabel] = labels.includes(handLabel) ? baseRange[handLabel] || { raise: 1, call: 0, fold: 0 } : { raise: 0, call: 0, fold: 1 };
      return accumulator;
    }, {});

    replaceRangeOverrides(rangeKey, importedRange);
    pushToast(`Imported ${labels.length} hands into ${rangeState.position} ${rangeState.scenario}.`, 'success');
  };

  return (
    <ScreenContainer contentContainerStyle={styles.screenContent} scrollable>
      <SectionCard>
        <Text style={styles.eyebrow}>Range Builder</Text>
        <Text style={styles.heroTitle}>Preflop construction lab</Text>
        <Text style={styles.heroCopy}>Switch seats, pressure scenarios, and tighten or widen the chart with immediate color feedback.</Text>

        <Text style={styles.controlLabel}>Position</Text>
        <View style={styles.chipRow}>
          {POSITIONS.map((position) => (
            <Pressable key={position} onPress={() => updateRangeState({ position })} style={[styles.chip, rangeState.position === position ? styles.chipActive : null]}>
              <Text style={[styles.chipLabel, rangeState.position === position ? styles.chipLabelActive : null]}>{position}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.controlLabel}>Scenario</Text>
        <View style={styles.chipRow}>
          {SCENARIOS.map((scenario) => (
            <Pressable key={scenario} onPress={() => updateRangeState({ scenario })} style={[styles.chip, rangeState.scenario === scenario ? styles.chipActive : null]}>
              <Text style={[styles.chipLabel, rangeState.scenario === scenario ? styles.chipLabelActive : null]}>{scenario}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.toneCard}>
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>Range tightness</Text>
            <Text style={styles.metricValue}>{rangeState.tightness}%</Text>
          </View>
          <View style={styles.chipRow}>
            {tightnessSteps.map((value) => (
              <Pressable key={value} onPress={() => updateRangeState({ tightness: value })} style={[styles.smallChip, rangeState.tightness === value ? styles.chipActive : null]}>
                <Text style={[styles.smallChipLabel, rangeState.tightness === value ? styles.chipLabelActive : null]}>{value}%</Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={styles.buttonRow}>
          <Pressable onPress={handleExport} style={[styles.primaryButton, styles.flexButton]}>
            <Text style={styles.primaryButtonLabel}>Export Range</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              resetRangeOverrides(rangeKey);
              updateRangeState({ tightness: 68 });
              pushToast('Range reset to GTO default.', 'info');
            }}
            style={[styles.secondaryButton, styles.flexButton]}
          >
            <Text style={styles.secondaryButtonLabel}>Reset Default</Text>
          </Pressable>
        </View>

        <Text style={styles.controlLabel}>Import comma-separated hands</Text>
        <TextInput
          multiline
          numberOfLines={4}
          onChangeText={setImportText}
          placeholder="AA, AKs, KQo, 76s"
          placeholderTextColor={colors.muted}
          style={styles.textArea}
          value={importText}
        />
        <Pressable onPress={handleImport} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonLabel}>Import Range</Text>
        </Pressable>
      </SectionCard>

      <View style={styles.summaryGrid}>
        {[
          { label: 'Hands Included', value: `${stats.openRate}%` },
          { label: 'Raise Weight', value: `${stats.raiseWeight}%` },
          { label: 'Call Weight', value: `${stats.callWeight}%` },
          { label: 'Mixed Cells', value: String(stats.mixedCells) },
        ].map((card) => (
          <SectionCard key={card.label} style={styles.metricCard}>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={styles.statValue}>{card.value}</Text>
          </SectionCard>
        ))}
      </View>

      <HandGrid
        onCellPress={(handLabel, profile) => setRangeOverride(rangeKey, handLabel, cycleProfile(profile))}
        rangeData={displayRange}
        subtitle="Tap cells to cycle Raise, Call, Mixed, and Fold overrides."
        title={`${rangeState.position} • ${rangeState.scenario}`}
      />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  heroTitle: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 34,
    marginTop: spacing.xs,
  },
  heroCopy: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  controlLabel: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  chip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.md - 2,
    paddingVertical: spacing.sm + 2,
  },
  smallChip: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 4,
    paddingVertical: spacing.sm,
  },
  chipActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.36)',
  },
  chipLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  smallChipLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: colors.accent,
  },
  toneCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    padding: spacing.md,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: colors.text,
    fontSize: 14,
  },
  metricValue: {
    color: colors.accent,
    fontFamily: fonts.mono,
    fontSize: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  flexButton: {
    flex: 1,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.3)',
    borderRadius: radius.lg,
    borderWidth: 1,
    paddingVertical: spacing.sm + 4,
  },
  primaryButtonLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
    paddingVertical: spacing.sm + 4,
  },
  secondaryButtonLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  textArea: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    marginTop: spacing.sm,
    minHeight: 110,
    padding: spacing.md,
    textAlignVertical: 'top',
  },
  summaryGrid: {
    gap: spacing.sm,
  },
  metricCard: {
    paddingVertical: spacing.md,
  },
  statLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  statValue: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 30,
    marginTop: spacing.sm,
  },
});

export default RangeBuilderScreen;