import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import ScreenContainer from '@/components/ScreenContainer';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { evaluateSevenCardHand, estimateDrawOuts } from '@/utils/handEvaluator';
import { parseHandHistory } from '@/utils/handParser';

const SAMPLE_HISTORY = `PokerStars Hand #1234567890: Hold'em No Limit ($0.50/$1.00 USD) - 2026/03/09 20:15:20 ET
Table 'Cassiopeia' 6-max Seat #3 is the button
Seat 1: Hero ($100 in chips)
Seat 2: Villain1 ($132 in chips)
Seat 3: Villain2 ($114 in chips)
Seat 4: Villain3 ($89 in chips)
Seat 5: Villain4 ($76 in chips)
Seat 6: Villain5 ($101 in chips)
Hero: posts small blind $0.50
Villain1: posts big blind $1.00
*** HOLE CARDS ***
Dealt to Hero [Ah Kh]
Villain2: folds
Villain3: folds
Villain4: raises $2 to $3
Villain5: folds
Hero: calls $2.50
Villain1: folds
*** FLOP *** [Qh Jh 2c]
Hero: checks
Villain4: bets $4 into $7
Hero: calls $4
*** TURN *** [Qh Jh 2c] [9h]
Hero: checks
Villain4: bets $12 into $15
Hero: raises $22 to $34
Villain4: calls $22
*** RIVER *** [Qh Jh 2c 9h] [3d]
Hero: bets $28
Villain4: folds
Hero collected $81.50 from pot`;

const cardRanks = '23456789TJQKA';

const toHandLabel = (cards) => {
  if (!cards?.length || cards.length !== 2) {
    return 'Unknown';
  }

  const [first, second] = cards;
  const firstRank = first[0].toUpperCase();
  const secondRank = second[0].toUpperCase();
  const suited = first[1].toLowerCase() === second[1].toLowerCase();

  if (firstRank === secondRank) {
    return `${firstRank}${secondRank}`;
  }

  const ordered = [firstRank, secondRank].sort((left, right) => cardRanks.indexOf(right) - cardRanks.indexOf(left));
  return `${ordered[0]}${ordered[1]}${suited ? 's' : 'o'}`;
};

const boardAtStreet = (parsed, street) => {
  if (street === 'preflop') {
    return [];
  }
  if (street === 'flop') {
    return parsed.board.flop;
  }
  if (street === 'turn') {
    return [...parsed.board.flop, parsed.board.turn].filter(Boolean);
  }
  return [...parsed.board.flop, parsed.board.turn, parsed.board.river].filter(Boolean);
};

const evaluateDeviation = (parsed) => {
  const heroHandLabel = toHandLabel(parsed.heroHand);
  const premiumHands = new Set(['AA', 'KK', 'QQ', 'JJ', 'AKs', 'AKo', 'AQs']);
  const suitedBroadways = new Set(['KQs', 'QJs', 'JTs']);

  return parsed.timeline
    .filter((entry) => entry.actor === parsed.hero)
    .map((entry) => {
      const boardCards = boardAtStreet(parsed, entry.street);
      const drawData = boardCards.length >= 3 ? estimateDrawOuts(parsed.heroHand, boardCards) : { outs: 0, label: 'No draw' };
      const evaluation = boardCards.length >= 3 ? evaluateSevenCardHand([...parsed.heroHand, ...boardCards]) : null;
      const madeStrength = evaluation?.category || 0;
      let deviation = 0;
      let message = 'Action is close to the baseline.';

      if (entry.street === 'preflop' && entry.action === 'folds' && premiumHands.has(heroHandLabel)) {
        deviation = -2.4;
        message = `Folding ${heroHandLabel} preflop versus pressure is too tight in equilibrium.`;
      } else if (entry.street === 'preflop' && entry.action === 'calls' && suitedBroadways.has(heroHandLabel)) {
        deviation = 0.3;
        message = `${heroHandLabel} flatting preflop is acceptable, though some lines prefer 3-betting.`;
      } else if (entry.action === 'folds' && (drawData.outs >= 8 || madeStrength >= 1)) {
        deviation = -1.7;
        message = `Folding ${heroHandLabel} with ${drawData.outs} outs / made equity gives up too much realization.`;
      } else if (entry.action === 'calls' && drawData.outs >= 12) {
        deviation = -0.4;
        message = 'Calling is profitable, but the combo draw can raise at meaningful frequency.';
      } else if (entry.action === 'raises' && (drawData.outs >= 8 || madeStrength >= 4)) {
        deviation = 0.8;
        message = 'Aggressive leverage is strong here: the raise attacks capped continues and builds value.';
      } else if (entry.action === 'bets' && madeStrength === 0 && drawData.outs < 6) {
        deviation = -0.8;
        message = 'This stab is slightly overbluffed relative to the simplified baseline.';
      }

      const severity = deviation <= -2 ? 'high' : deviation < 0 ? 'medium' : 'good';

      return {
        ...entry,
        heroHandLabel,
        deviation,
        severity,
        message,
      };
    });
};

const gradeHand = (deviations) => {
  const penalty = deviations.reduce((sum, entry) => sum + Math.abs(Math.min(entry.deviation, 0)) * 12, 0);
  const score = Math.max(0, 100 - penalty);

  if (score >= 90) return { grade: 'A', score };
  if (score >= 80) return { grade: 'B', score };
  if (score >= 70) return { grade: 'C', score };
  if (score >= 60) return { grade: 'D', score };
  return { grade: 'F', score };
};

const HandHistoryScreen = () => {
  const [historyText, setHistoryText] = useState(SAMPLE_HISTORY);
  const parsed = useMemo(() => parseHandHistory(historyText), [historyText]);
  const heroDeviations = useMemo(() => evaluateDeviation(parsed), [parsed]);
  const grade = gradeHand(heroDeviations);
  const streetEvs = ['preflop', 'flop', 'turn', 'river'].map((street) => ({
    street,
    ev: heroDeviations.filter((entry) => entry.street === street).reduce((sum, entry) => sum + entry.deviation, 0),
  }));

  return (
    <ScreenContainer contentContainerStyle={styles.screenContent} scrollable>
      <SectionCard>
        <Text style={styles.eyebrow}>Hand History Analyzer</Text>
        <Text style={styles.heroTitle}>Deviation audit</Text>
        <Text style={styles.heroCopy}>Paste PokerStars or GGPoker style text and the analyzer reconstructs the action timeline, approximate EV swings, and baseline GTO drift.</Text>

        <Pressable onPress={() => setHistoryText(SAMPLE_HISTORY)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonLabel}>Load Sample Hand</Text>
        </Pressable>

        <TextInput
          multiline
          numberOfLines={24}
          onChangeText={setHistoryText}
          placeholder="Paste a PokerStars or GGPoker hand history here..."
          placeholderTextColor={colors.muted}
          style={styles.textArea}
          value={historyText}
        />
      </SectionCard>

      <View style={styles.summaryGrid}>
        {[
          { label: 'Hero', value: parsed.hero || 'Unknown' },
          { label: 'Hero Hand', value: toHandLabel(parsed.heroHand) },
          { label: 'Final Pot', value: `${parsed.summary?.finalPot?.toFixed(1) || '0.0'}` },
          { label: 'Overall Grade', value: `${grade.grade} • ${grade.score.toFixed(0)}` },
        ].map((card) => (
          <SectionCard key={card.label} style={styles.metricCard}>
            <Text style={styles.statLabel}>{card.label}</Text>
            <Text style={styles.statValue}>{card.value}</Text>
          </SectionCard>
        ))}
      </View>

      <SectionCard>
        <Text style={styles.sectionTitle}>Action Timeline</Text>
        <Text style={styles.sectionSubtitle}>Vertical reconstruction with pot growth, SPR, and decision tags.</Text>
        <Text style={styles.inlineMeta}>Board: {parsed.boardCards.join(' ') || 'No board'}</Text>

        <View style={styles.timeline}>
          {parsed.timeline.map((entry, index) => {
            const deviation = heroDeviations.find((item) => item.raw === entry.raw);
            return (
              <View key={`${entry.raw}-${index}`} style={styles.timelineCard}>
                <View style={styles.timelineDot} />
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineText}>{entry.actor} {entry.action}{entry.amount ? ` ${entry.amount}` : ''}</Text>
                    <Text style={styles.timelineStreet}>{entry.street}</Text>
                  </View>
                  <Text style={styles.inlineMeta}>Pot {entry.potAfter.toFixed(1)} • SPR {entry.spr.toFixed(2)} • Hero hand {toHandLabel(parsed.heroHand)}</Text>
                  {deviation ? (
                    <View style={[styles.deviationCard, deviation.severity === 'high' ? styles.deviationHigh : deviation.severity === 'medium' ? styles.deviationMedium : styles.deviationGood]}>
                      <Text style={[styles.deviationText, deviation.severity === 'high' ? styles.deviationHighText : deviation.severity === 'medium' ? styles.deviationMediumText : styles.deviationGoodText]}>
                        {deviation.message} {deviation.deviation !== 0 ? `(${deviation.deviation > 0 ? '+' : ''}${deviation.deviation.toFixed(1)}bb)` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Street EV Estimate</Text>
        <Text style={styles.sectionSubtitle}>Positive values indicate the line tracked closely to the baseline.</Text>
        <View style={styles.stack}>
          {streetEvs.map((item) => (
            <View key={item.street} style={styles.rowCard}>
              <Text style={styles.rowLabel}>{item.street}</Text>
              <Text style={[styles.rowValue, item.ev >= 0 ? styles.goodValue : styles.badValue]}>{item.ev >= 0 ? '+' : ''}{item.ev.toFixed(1)}bb</Text>
            </View>
          ))}
        </View>
      </SectionCard>

      <SectionCard>
        <Text style={styles.sectionTitle}>Deviation Alerts</Text>
        <Text style={styles.sectionSubtitle}>Largest negative drifts from the simplified solver baseline.</Text>
        <View style={styles.stack}>
          {heroDeviations.filter((entry) => entry.deviation < 0).slice(0, 4).map((entry) => (
            <View key={`${entry.raw}-alert`} style={[styles.rowCard, styles.alertCard]}>
              <Text style={styles.alertText}>{entry.message}</Text>
            </View>
          ))}
          {!heroDeviations.some((entry) => entry.deviation < 0) ? <Text style={styles.inlineMeta}>No severe deviations detected in the current hand.</Text> : null}
        </View>
      </SectionCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  screenContent: {
    gap: spacing.md,
  },
  summaryGrid: {
    gap: spacing.sm,
  },
  stack: {
    gap: spacing.sm,
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
  textArea: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    marginTop: spacing.md,
    minHeight: 420,
    padding: spacing.md,
    textAlignVertical: 'top',
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
  inlineMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  timeline: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  timelineCard: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
  },
  timelineDot: {
    backgroundColor: colors.accent,
    borderRadius: 999,
    height: 10,
    marginTop: 6,
    width: 10,
  },
  timelineContent: {
    flex: 1,
  },
  timelineHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  timelineText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingRight: spacing.sm,
  },
  timelineStreet: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  deviationCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.sm,
    padding: spacing.sm + 2,
  },
  deviationHigh: {
    backgroundColor: 'rgba(231, 76, 60, 0.12)',
    borderColor: 'rgba(231, 76, 60, 0.3)',
  },
  deviationMedium: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.3)',
  },
  deviationGood: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: 'rgba(46, 204, 113, 0.3)',
  },
  deviationText: {
    fontSize: 13,
    lineHeight: 18,
  },
  deviationHighText: {
    color: colors.danger,
  },
  deviationMediumText: {
    color: colors.accent,
  },
  deviationGoodText: {
    color: colors.success,
  },
  rowCard: {
    alignItems: 'center',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.md,
  },
  rowLabel: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rowValue: {
    fontFamily: fonts.mono,
    fontSize: 15,
  },
  goodValue: {
    color: colors.success,
  },
  badValue: {
    color: colors.danger,
  },
  alertCard: {
    justifyContent: 'flex-start',
  },
  alertText: {
    color: colors.danger,
    fontSize: 13,
    lineHeight: 18,
  },
});

export default HandHistoryScreen;