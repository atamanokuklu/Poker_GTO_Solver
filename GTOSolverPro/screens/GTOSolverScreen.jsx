import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import ActionTree from '@/components/ActionTree';
import CardSelect from '@/components/CardSelect';
import MetricBarChart from '@/components/MetricBarChart';
import ScreenContainer from '@/components/ScreenContainer';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAppContext } from '@/context/AppContext';
import { POSITIONS, getDefaultRange } from '@/data/gtoRanges';
import { MDF, SPR, bluffRatio, deriveSolverSnapshot, potOdds } from '@/utils/pokerMath';

const STREETS = ['Preflop', 'Flop', 'Turn', 'River'];
const BET_SIZES = [33, 50, 75, 100, 150, 250];
const BOARD_SLOTS = ['Flop 1', 'Flop 2', 'Flop 3', 'Turn', 'River'];

const GTOSolverScreen = () => {
  const { boardState, updateBoardState } = useAppContext();
  const [street, setStreet] = useState('Flop');
  const [heroPosition, setHeroPosition] = useState('BTN');
  const [villainPosition, setVillainPosition] = useState('BB');
  const [heroStack, setHeroStack] = useState('100');
  const [villainStack, setVillainStack] = useState('100');
  const [potSize, setPotSize] = useState('12');
  const [selectedBetSizes, setSelectedBetSizes] = useState([33, 75, 100]);

  const heroStackValue = Math.max(20, Number(heroStack) || 20);
  const villainStackValue = Math.max(20, Number(villainStack) || 20);
  const potSizeValue = Math.max(1, Number(potSize) || 1);
  const heroRange = getDefaultRange(heroPosition, 'RFI');
  const villainRange = getDefaultRange(villainPosition, villainPosition === 'BB' ? 'vs 3bet' : 'RFI');

  const snapshot = useMemo(
    () =>
      deriveSolverSnapshot({
        range: heroRange,
        villainRange,
        boardCards: boardState.solverBoard.filter(Boolean),
        betSizeOptions: selectedBetSizes,
        potSize: potSizeValue,
        street,
        heroPosition,
        villainPosition,
      }),
    [boardState.solverBoard, heroPosition, heroRange, potSizeValue, selectedBetSizes, street, villainPosition, villainRange],
  );

  const referenceBetSize = snapshot.recommendedSizing.size === 250 ? heroStackValue : (potSizeValue * snapshot.recommendedSizing.size) / 100;
  const mathCards = [
    { label: 'Pot Odds', value: `${(potOdds(referenceBetSize, potSizeValue) * 100).toFixed(1)}%` },
    { label: 'MDF', value: `${(MDF(referenceBetSize, potSizeValue) * 100).toFixed(1)}%` },
    { label: 'Bluff Ratio', value: `${(bluffRatio(potOdds(referenceBetSize, potSizeValue)) * 100).toFixed(1)}%` },
    { label: 'SPR', value: SPR(Math.min(heroStackValue, villainStackValue), potSizeValue).toFixed(2) },
  ];

  const evData = [
    ...snapshot.sizingSummary.map((item) => ({ label: item.size === 250 ? 'All-In' : `${item.size}%`, ev: Number(item.ev.toFixed(2)) })),
    { label: 'Check', ev: Number((snapshot.rows.reduce((sum, row) => sum + row.checkEV, 0) / (snapshot.rows.length || 1)).toFixed(2)) },
    { label: 'Fold', ev: 0 },
  ];

  return (
    <ScreenContainer contentContainerStyle={styles.screenContent} scrollable>
      <SectionCard>
        <Text style={styles.eyebrow}>GTO Solver</Text>
        <Text style={styles.heroTitle}>Board-aware approximation</Text>
        <Text style={styles.heroCopy}>The solver uses pot odds, MDF, bluff ratios, nut advantage, and polarized range heuristics to build a playable strategy tree client-side.</Text>

        <Text style={styles.controlLabel}>Street</Text>
        <View style={styles.chipRow}>
          {STREETS.map((item) => (
            <Pressable key={item} onPress={() => setStreet(item)} style={[styles.chip, street === item ? styles.chipActive : null]}>
              <Text style={[styles.chipLabel, street === item ? styles.chipLabelActive : null]}>{item}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.controlLabel}>Board cards</Text>
        <View style={styles.selectGrid}>
          {boardState.solverBoard.map((card, index) => (
            <CardSelect
              key={`board-${index}`}
              excludedCards={boardState.solverBoard.filter((_, itemIndex) => itemIndex !== index)}
              onChange={(nextCard) => {
                const nextBoard = [...boardState.solverBoard];
                nextBoard[index] = nextCard;
                updateBoardState('solverBoard', nextBoard);
              }}
              placeholder={BOARD_SLOTS[index]}
              value={card}
            />
          ))}
        </View>

        <View style={styles.dualColumn}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Hero Position</Text>
            <View style={styles.pickerShell}>
              <Picker dropdownIconColor={colors.accent} selectedValue={heroPosition} style={styles.picker} onValueChange={setHeroPosition}>
                {POSITIONS.map((position) => (
                  <Picker.Item key={position} color={colors.text} label={position} value={position} />
                ))}
              </Picker>
            </View>
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Villain Position</Text>
            <View style={styles.pickerShell}>
              <Picker dropdownIconColor={colors.accent} selectedValue={villainPosition} style={styles.picker} onValueChange={setVillainPosition}>
                {POSITIONS.map((position) => (
                  <Picker.Item key={position} color={colors.text} label={position} value={position} />
                ))}
              </Picker>
            </View>
          </View>
        </View>

        <View style={styles.dualColumn}>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Hero Stack</Text>
            <TextInput keyboardType="numeric" onChangeText={setHeroStack} style={styles.input} value={heroStack} />
          </View>
          <View style={styles.fieldBlock}>
            <Text style={styles.fieldLabel}>Villain Stack</Text>
            <TextInput keyboardType="numeric" onChangeText={setVillainStack} style={styles.input} value={villainStack} />
          </View>
        </View>

        <View style={styles.fieldBlockWide}>
          <Text style={styles.fieldLabel}>Pot Size (bb)</Text>
          <TextInput keyboardType="numeric" onChangeText={setPotSize} style={styles.input} value={potSize} />
        </View>

        <Text style={styles.controlLabel}>Bet sizing options</Text>
        <View style={styles.chipRow}>
          {BET_SIZES.map((size) => {
            const enabled = selectedBetSizes.includes(size);
            return (
              <Pressable
                key={size}
                onPress={() =>
                  setSelectedBetSizes((current) => {
                    if (enabled && current.length === 1) {
                      return current;
                    }

                    const next = enabled ? current.filter((item) => item !== size) : [...current, size];
                    return next.sort((left, right) => left - right);
                  })
                }
                style={[styles.chip, enabled ? styles.chipActive : null]}
              >
                <Text style={[styles.chipLabel, enabled ? styles.chipLabelActive : null]}>{size === 250 ? 'All-In' : `${size}%`}</Text>
              </Pressable>
            );
          })}
        </View>
      </SectionCard>

      <View style={styles.summaryGrid}>
        {mathCards.map((card) => (
          <SectionCard key={card.label} style={styles.metricCard}>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={styles.statValue}>{card.value}</Text>
          </SectionCard>
        ))}
      </View>

      <SectionCard>
        <View style={styles.inlineHeader}>
          <View>
            <Text style={styles.sectionTitle}>Recommended sizing</Text>
            <Text style={styles.sectionSubtitle}>Highest aggregate EV across the active sizing tree.</Text>
          </View>
          <View>
            <Text style={styles.sectionValue}>{snapshot.recommendedSizing.size === 250 ? 'All-In' : `${snapshot.recommendedSizing.size}%`}</Text>
            <Text style={styles.sectionMeta}>EV {snapshot.recommendedSizing.ev.toFixed(2)}bb</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.bannerCard, snapshot.rangeAdvantage.leader === 'Hero' ? styles.bannerGood : styles.bannerBad]}>
            <Text style={styles.bannerLabel}>Range Advantage</Text>
            <Text style={styles.bannerTitle}>{snapshot.rangeAdvantage.leader}</Text>
            <Text style={styles.bannerCopy}>Edge {snapshot.rangeAdvantage.nutAdvantagePct.toFixed(1)} on {snapshot.rangeAdvantage.texture}</Text>
          </View>
          <View style={styles.bannerCard}>
            <Text style={styles.bannerLabel}>Mixed Strategy</Text>
            <Text style={styles.bannerTitle}>{snapshot.rows.find((row) => row.betPct > 0.2 && row.betPct < 0.8)?.label || 'A5s'}</Text>
            <Text style={styles.bannerCopy}>{snapshot.rows.find((row) => row.betPct > 0.2 && row.betPct < 0.8)?.mixText || 'Bet 60% / Check 40%'}</Text>
          </View>
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Action Frequency Table</Text>
        <Text style={styles.sectionSubtitle}>Top range rows with heuristic mix, EV, and preferred size.</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tableWrap}>
          <View>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              {['Hand', 'Bet', 'Check', 'Raise', 'Fold', 'Best Size', 'EV'].map((header) => (
                <Text key={header} style={[styles.tableCell, styles.tableHeader]}>{header}</Text>
              ))}
            </View>
            {snapshot.rows.slice(0, 28).map((row) => (
              <View key={row.label} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableGold]}>{row.label}</Text>
                <Text style={styles.tableCell}>{Math.round(row.betPct * 100)}%</Text>
                <Text style={styles.tableCell}>{Math.round(row.checkPct * 100)}%</Text>
                <Text style={styles.tableCell}>{Math.round(row.raisePct * 100)}%</Text>
                <Text style={styles.tableCell}>{Math.round(row.foldPct * 100)}%</Text>
                <Text style={styles.tableCell}>{row.bestSize === 250 ? 'All-In' : `${row.bestSize}%`}</Text>
                <Text style={styles.tableCell}>{row.bestEV.toFixed(2)}bb</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>EV Comparison</Text>
        <Text style={styles.sectionSubtitle}>Aggregate EV for the selected bet tree versus passive options.</Text>
        <View style={styles.chartWrap}>
          <MetricBarChart
            data={evData}
            labelKey="label"
            series={[{ key: 'ev', label: 'EV', color: colors.accent }]}
            formatValue={(value) => `${value.toFixed(2)}bb`}
          />
        </View>
      </SectionCard>

      <ActionTree tree={snapshot.nodeTree} />
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
  chipActive: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.34)',
  },
  chipLabel: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  chipLabelActive: {
    color: colors.accent,
  },
  selectGrid: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  dualColumn: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  fieldBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  fieldBlockWide: {
    gap: spacing.xs,
    marginTop: spacing.md,
  },
  fieldLabel: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
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
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 4,
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
  inlineHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  sectionValue: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 32,
    textAlign: 'right',
  },
  sectionMeta: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'right',
  },
  bannerCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.md,
  },
  bannerGood: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: 'rgba(46, 204, 113, 0.24)',
  },
  bannerBad: {
    backgroundColor: 'rgba(231, 76, 60, 0.12)',
    borderColor: 'rgba(231, 76, 60, 0.24)',
  },
  bannerLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  bannerTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
    marginTop: spacing.sm,
  },
  bannerCopy: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  tableWrap: {
    marginTop: spacing.md,
  },
  tableHeaderRow: {
    backgroundColor: colors.card,
  },
  tableRow: {
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
  },
  tableHeader: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableCell: {
    color: colors.text,
    minWidth: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm + 2,
  },
  tableGold: {
    color: colors.accent,
    fontWeight: '700',
  },
  chartWrap: {
    marginTop: spacing.md,
  },
});

export default GTOSolverScreen;