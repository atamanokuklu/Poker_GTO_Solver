import { useMemo, useState } from 'react';
import { AlertTriangle, CircleDot, Trophy } from 'lucide-react';
import { parseHandHistory } from '../utils/handParser';
import { estimateDrawOuts, evaluateSevenCardHand } from '../utils/handEvaluator';

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
        message = `Calling is profitable, but the combo draw can raise at meaningful frequency.`;
      } else if (entry.action === 'raises' && (drawData.outs >= 8 || madeStrength >= 4)) {
        deviation = 0.8;
        message = `Aggressive leverage is strong here: the raise attacks capped continues and builds value.`;
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

const HandHistoryAnalyzer = () => {
  const [historyText, setHistoryText] = useState(SAMPLE_HISTORY);
  const parsed = useMemo(() => parseHandHistory(historyText), [historyText]);
  const heroDeviations = useMemo(() => evaluateDeviation(parsed), [parsed]);
  const grade = gradeHand(heroDeviations);
  const streetEvs = ['preflop', 'flop', 'turn', 'river'].map((street) => ({
    street,
    ev: heroDeviations.filter((entry) => entry.street === street).reduce((sum, entry) => sum + entry.deviation, 0),
  }));

  return (
    <div className="module-shell grid gap-6 xl:grid-cols-[430px_1fr]">
      <section className="glass-panel rounded-[28px] p-5">
        <p className="text-xs uppercase tracking-[0.32em] text-muted">Hand History Analyzer</p>
        <h2 className="mt-2 font-display text-4xl text-gold">Deviation audit</h2>
        <p className="mt-3 text-sm leading-6 text-muted">Paste PokerStars or GGPoker style text and the analyzer reconstructs the action timeline, approximate EV swings, and baseline GTO drift.</p>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={() => setHistoryText(SAMPLE_HISTORY)} className="pressable rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm text-gold">
            Load Sample Hand
          </button>
        </div>

        <textarea
          rows="24"
          value={historyText}
          onChange={(event) => setHistoryText(event.target.value)}
          className="mt-4 w-full rounded-3xl border border-white/5 bg-felt px-4 py-4 text-sm leading-6 text-ink outline-none"
          placeholder="Paste a PokerStars or GGPoker hand history here..."
        />
      </section>

      <section className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { label: 'Hero', value: parsed.hero || 'Unknown' },
            { label: 'Hero Hand', value: toHandLabel(parsed.heroHand) },
            { label: 'Final Pot', value: `${parsed.summary?.finalPot?.toFixed(1) || '0.0'}` },
            { label: 'Overall Grade', value: `${grade.grade} • ${grade.score.toFixed(0)}` },
          ].map((card) => (
            <div key={card.label} className="glass-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">{card.label}</p>
              <p className="mt-3 font-display text-3xl text-gold">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 2xl:grid-cols-[1.1fr_0.9fr]">
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-end justify-between gap-4">
              <div>
                <h3 className="font-display text-2xl text-gold">Action Timeline</h3>
                <p className="mt-1 text-xs text-muted">Vertical reconstruction with pot growth, SPR, and decision tags.</p>
              </div>
              <div className="text-right text-xs text-muted">Board: {parsed.boardCards.join(' ') || 'No board'}</div>
            </div>

            <div className="mt-5 space-y-3">
              {parsed.timeline.map((entry, index) => {
                const deviation = heroDeviations.find((item) => item.raw === entry.raw);
                return (
                  <div key={`${entry.raw}-${index}`} className="flex gap-3 rounded-2xl border border-white/5 bg-surface/70 px-4 py-4">
                    <div className="mt-1 text-gold">
                      <CircleDot className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm text-ink">{entry.actor} {entry.action}{entry.amount ? ` ${entry.amount}` : ''}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-muted">{entry.street}</p>
                      </div>
                      <p className="mt-1 text-xs text-muted">Pot {entry.potAfter.toFixed(1)} • SPR {entry.spr.toFixed(2)} • Hero hand {toHandLabel(parsed.heroHand)}</p>
                      {deviation ? (
                        <div className={`mt-3 rounded-2xl border px-3 py-3 text-sm ${deviation.severity === 'high' ? 'animate-pulseAlert border-danger/35 bg-danger/10 text-danger' : deviation.severity === 'medium' ? 'border-gold/25 bg-gold/10 text-gold' : 'border-success/25 bg-success/10 text-success'}`}>
                          {deviation.message} {deviation.deviation !== 0 ? `(${deviation.deviation > 0 ? '+' : ''}${deviation.deviation.toFixed(1)}bb)` : ''}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-5">
              <div className="flex items-start gap-3">
                <Trophy className="mt-1 h-5 w-5 text-gold" />
                <div>
                  <h3 className="font-display text-2xl text-gold">Street EV Estimate</h3>
                  <p className="mt-1 text-xs text-muted">Positive values indicate the line tracked closely to the baseline.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {streetEvs.map((item) => (
                  <div key={item.street} className="rounded-2xl border border-white/5 bg-surface/70 px-4 py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm uppercase tracking-[0.2em] text-muted">{item.street}</p>
                      <p className={`text-sm ${item.ev >= 0 ? 'text-success' : 'text-danger'}`}>{item.ev >= 0 ? '+' : ''}{item.ev.toFixed(1)}bb</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 text-gold" />
                <div>
                  <h3 className="font-display text-2xl text-gold">Deviation Alerts</h3>
                  <p className="mt-1 text-xs text-muted">Largest negative drifts from the simplified solver baseline.</p>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                {heroDeviations.filter((entry) => entry.deviation < 0).slice(0, 4).map((entry) => (
                  <div key={`${entry.raw}-alert`} className="animate-pulseAlert rounded-2xl border border-danger/30 bg-danger/10 px-4 py-4 text-sm text-danger">
                    {entry.message}
                  </div>
                ))}
                {!heroDeviations.some((entry) => entry.deviation < 0) ? <p className="text-sm text-muted">No severe deviations detected in the current hand.</p> : null}
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HandHistoryAnalyzer;