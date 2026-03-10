import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import CardPicker from '@/components/CardPicker';
import CardSelect from '@/components/CardSelect';
import EquityChart from '@/components/EquityChart';
import HandGrid from '@/components/HandGrid';
import ScreenContainer from '@/components/ScreenContainer';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { useAppContext } from '@/context/AppContext';
import { parseRangeText, serializeRange } from '@/data/gtoRanges';
import { cardsToHandLabel, normalizeCardCode } from '@/utils/cards';
import { simulateHandVsHand, simulateRangeEquity } from '@/utils/pokerMath';

const gridDataFromLabels = (labels) =>
  labels.reduce((accumulator, label) => {
    accumulator[label] = { raise: 1, call: 0, fold: 0 };
    return accumulator;
  }, {});

const toggleLabelInText = (text, handLabel) => {
  const set = new Set(parseRangeText(text));

  if (set.has(handLabel)) {
    set.delete(handLabel);
  } else {
    set.add(handLabel);
  }

  return serializeRange(Array.from(set).reduce((accumulator, label) => ({ ...accumulator, [label]: { raise: 1, call: 0, fold: 0 } }), {}));
};

const setCardAtIndex = (cards, index, nextCard) => cards.map((card, cardIndex) => (cardIndex === index ? normalizeCardCode(nextCard) : card));

const formatSelectedHand = (cards) => {
  const normalized = cards.map(normalizeCardCode).filter(Boolean);

  if (normalized.length !== 2) {
    return 'Select two exact cards';
  }

  return `${normalized.join(' ')} • ${cardsToHandLabel(normalized)}`;
};

const EquityCalculatorScreen = () => {
  const { boardState, updateBoardState, pushToast } = useAppContext();
  const [mode, setMode] = useState('range');
  const [heroRangeText, setHeroRangeText] = useState('AA, KK, QQ, JJ, TT, AKs, AQs, AJs, KQs');
  const [villainRangeText, setVillainRangeText] = useState('AA, KK, QQ, JJ, TT, 99, AKs, AKo, AQs, KQs');
  const [heroCards, setHeroCards] = useState(['As', 'Ks']);
  const [villainCards, setVillainCards] = useState(['Qh', 'Qc']);
  const [iterations, setIterations] = useState(10000);
  const [result, setResult] = useState(null);

  const heroLabels = useMemo(() => parseRangeText(heroRangeText), [heroRangeText]);
  const villainLabels = useMemo(() => parseRangeText(villainRangeText), [villainRangeText]);

  const runSimulation = () => {
    const nextResult =
      mode === 'range'
        ? simulateRangeEquity({ heroInput: heroLabels, villainInput: villainLabels, boardCards: boardState.equityBoard, iterations })
        : simulateHandVsHand({ heroCards, villainCards, boardCards: boardState.equityBoard, iterations });

    if (!nextResult) {
      pushToast('Unable to compute equity. Check your range or hand inputs.', 'error');
      return;
    }

    setResult(nextResult);
    pushToast(`Monte Carlo run completed over ${nextResult.iterations} iterations.`, 'success');
  };

  return (
    <ScreenContainer contentContainerStyle={styles.screenContent} scrollable>
      <SectionCard>
        <Text style={styles.eyebrow}>Equity Calculator</Text>
        <Text style={styles.heroTitle}>Range versus range engine</Text>
        <Text style={styles.heroCopy}>Use full 13x13 selection or direct text ranges, then run Monte Carlo to estimate equity, category density, and confidence intervals.</Text>

        <View style={styles.chipRow}>
          {[
            { id: 'range', label: 'Range vs Range' },
            { id: 'hand', label: 'Hand vs Hand' },
          ].map((option) => (
            <Pressable key={option.id} onPress={() => setMode(option.id)} style={[styles.chip, mode === option.id ? styles.chipActive : null]}>
              <Text style={[styles.chipLabel, mode === option.id ? styles.chipLabelActive : null]}>{option.label}</Text>
            </Pressable>
          ))}
        </View>

        {mode === 'range' ? (
          <View style={styles.stack}>
            <View>
              <Text style={styles.controlLabel}>Hero range</Text>
              <TextInput multiline numberOfLines={4} onChangeText={setHeroRangeText} placeholderTextColor={colors.muted} style={styles.textArea} value={heroRangeText} />
            </View>
            <View>
              <Text style={styles.controlLabel}>Villain range</Text>
              <TextInput multiline numberOfLines={4} onChangeText={setVillainRangeText} placeholderTextColor={colors.muted} style={styles.textArea} value={villainRangeText} />
            </View>
          </View>
        ) : (
          <View style={styles.stack}>
            <View style={styles.handBlock}>
              <Text style={styles.controlLabel}>Hero hand</Text>
              <Text style={styles.inlineMeta}>{formatSelectedHand(heroCards)}</Text>
              <View style={styles.stack}>
                {heroCards.map((card, index) => (
                  <CardSelect
                    key={`hero-card-${index}`}
                    excludedCards={[...boardState.equityBoard, ...villainCards, ...heroCards.filter((_, cardIndex) => cardIndex !== index)]}
                    onChange={(nextCard) => setHeroCards((current) => setCardAtIndex(current, index, nextCard))}
                    placeholder={`Hero card ${index + 1}`}
                    value={card}
                  />
                ))}
              </View>
            </View>
            <View style={styles.handBlock}>
              <Text style={styles.controlLabel}>Villain hand</Text>
              <Text style={styles.inlineMeta}>{formatSelectedHand(villainCards)}</Text>
              <View style={styles.stack}>
                {villainCards.map((card, index) => (
                  <CardSelect
                    key={`villain-card-${index}`}
                    excludedCards={[...boardState.equityBoard, ...heroCards, ...villainCards.filter((_, cardIndex) => cardIndex !== index)]}
                    onChange={(nextCard) => setVillainCards((current) => setCardAtIndex(current, index, nextCard))}
                    placeholder={`Villain card ${index + 1}`}
                    value={card}
                  />
                ))}
              </View>
            </View>
          </View>
        )}

        <Text style={styles.controlLabel}>Iterations</Text>
        <View style={styles.chipRow}>
          {[1000, 10000, 100000].map((value) => (
            <Pressable key={value} onPress={() => setIterations(value)} style={[styles.chip, iterations === value ? styles.chipActive : null]}>
              <Text style={[styles.chipLabel, iterations === value ? styles.chipLabelActive : null]}>{value >= 1000 ? `${value / 1000}k` : value}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable onPress={runSimulation} style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Run It Out</Text>
        </Pressable>
      </SectionCard>

      <CardPicker
        maxCards={5}
        onChangeCards={(nextCards) => {
          if (mode === 'hand') {
            const usedHoleCards = [...heroCards, ...villainCards].map(normalizeCardCode).filter(Boolean);

            if (nextCards.some((card) => usedHoleCards.includes(card))) {
              pushToast('That card is already assigned to a player hand.', 'error');
              return;
            }
          }

          updateBoardState('equityBoard', nextCards.slice(0, 5));
        }}
        selectedCards={boardState.equityBoard}
        title="Community Cards"
      />

      {mode === 'range' ? (
        <View style={styles.stack}>
          <HandGrid compact onCellPress={(handLabel) => setHeroRangeText(toggleLabelInText(heroRangeText, handLabel))} rangeData={gridDataFromLabels(heroLabels)} selectedHands={heroLabels} title="Hero Range Grid" />
          <HandGrid compact onCellPress={(handLabel) => setVillainRangeText(toggleLabelInText(villainRangeText, handLabel))} rangeData={gridDataFromLabels(villainLabels)} selectedHands={villainLabels} title="Villain Range Grid" />
        </View>
      ) : null}

      <View style={styles.stack}>
        <SectionCard>
          <Text style={styles.statLabel}>Hero Equity</Text>
          <Text style={[styles.statValue, styles.successValue]}>{result ? `${result.heroEquity.toFixed(1)}%` : '--'}</Text>
          <Text style={styles.heroCopy}>Confidence: {result ? `${result.confidence.low.toFixed(1)}% to ${result.confidence.high.toFixed(1)}%` : 'Run a simulation to populate.'}</Text>
        </SectionCard>
        <SectionCard>
          <Text style={styles.statLabel}>Villain Equity</Text>
          <Text style={styles.statValue}>{result ? `${result.villainEquity.toFixed(1)}%` : '--'}</Text>
          <Text style={styles.heroCopy}>Iterations: {result ? result.iterations : '--'}</Text>
          {mode === 'hand' && result ? <Text style={styles.heroCopy}>{result.drawLabel} • {result.outs} outs • flop to river {result.flopToRiver}%</Text> : null}
        </SectionCard>
      </View>

      <EquityChart data={result?.categoryBreakdown || []} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
  },
  stack: {
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
  handBlock: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  inlineMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    marginTop: spacing.xs,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.3)',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 4,
  },
  primaryButtonLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
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
    fontSize: 44,
    marginTop: spacing.sm,
  },
  successValue: {
    color: colors.success,
  },
});

export default EquityCalculatorScreen;