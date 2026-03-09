import { useMemo, useState } from 'react';
import CardSelect from '../components/CardSelect';
import CardPicker from '../components/CardPicker';
import EquityChart from '../components/EquityChart';
import HandGrid from '../components/HandGrid';
import { useAppContext } from '../context/AppContext';
import { parseRangeText, serializeRange } from '../data/gtoRanges';
import { cardsToHandLabel, normalizeCardCode } from '../utils/cards';
import { simulateHandVsHand, simulateRangeEquity } from '../utils/pokerMath';

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

const EquityCalculator = () => {
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
    <div className="module-shell space-y-6">
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <section className="space-y-6">
          <div className="glass-panel rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.32em] text-muted">Equity Calculator</p>
            <h2 className="mt-2 font-display text-4xl text-gold">Range versus range engine</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Use full 13x13 selection or direct text ranges, then run Monte Carlo to estimate equity, category density, and confidence intervals.</p>

            <div className="mt-6 flex gap-2">
              {[
                { id: 'range', label: 'Range vs Range' },
                { id: 'hand', label: 'Hand vs Hand' },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMode(option.id)}
                  className={`pressable rounded-full border px-4 py-2 text-sm ${mode === option.id ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-muted'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            {mode === 'range' ? (
              <div className="mt-6 space-y-4">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Hero range</label>
                  <textarea rows="4" value={heroRangeText} onChange={(event) => setHeroRangeText(event.target.value)} className="w-full rounded-2xl border border-white/5 bg-felt px-3 py-3 text-sm text-ink outline-none" />
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Villain range</label>
                  <textarea rows="4" value={villainRangeText} onChange={(event) => setVillainRangeText(event.target.value)} className="w-full rounded-2xl border border-white/5 bg-felt px-3 py-3 text-sm text-ink outline-none" />
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 xl:grid-cols-2">
                <div className="rounded-3xl border border-gold/12 bg-surface/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="block text-xs uppercase tracking-[0.25em] text-muted">Hero hand</label>
                    <p className="text-xs text-muted">{formatSelectedHand(heroCards)}</p>
                  </div>
                  <div className="grid gap-3">
                    {heroCards.map((card, index) => (
                      <CardSelect
                        key={`hero-card-${index}`}
                        value={card}
                        placeholder={`Hero card ${index + 1}`}
                        excludedCards={[
                          ...boardState.equityBoard,
                          ...villainCards,
                          ...heroCards.filter((_, cardIndex) => cardIndex !== index),
                        ]}
                        onChange={(nextCard) => setHeroCards((current) => setCardAtIndex(current, index, nextCard))}
                      />
                    ))}
                  </div>
                </div>
                <div className="rounded-3xl border border-gold/12 bg-surface/60 p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="block text-xs uppercase tracking-[0.25em] text-muted">Villain hand</label>
                    <p className="text-xs text-muted">{formatSelectedHand(villainCards)}</p>
                  </div>
                  <div className="grid gap-3">
                    {villainCards.map((card, index) => (
                      <CardSelect
                        key={`villain-card-${index}`}
                        value={card}
                        placeholder={`Villain card ${index + 1}`}
                        excludedCards={[
                          ...boardState.equityBoard,
                          ...heroCards,
                          ...villainCards.filter((_, cardIndex) => cardIndex !== index),
                        ]}
                        onChange={(nextCard) => setVillainCards((current) => setCardAtIndex(current, index, nextCard))}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Run it out iterations</label>
                <select value={iterations} onChange={(event) => setIterations(Number(event.target.value))} className="w-full rounded-2xl border border-white/5 bg-surface px-3 py-3 text-sm text-ink outline-none">
                  <option value={1000}>1k</option>
                  <option value={10000}>10k</option>
                  <option value={100000}>100k</option>
                </select>
              </div>
              <button type="button" onClick={runSimulation} className="pressable rounded-2xl border border-gold/25 bg-gold/10 px-5 py-3 text-sm text-gold">
                Run It Out
              </button>
            </div>
          </div>

          <CardPicker
            title="Community Cards"
            selectedCards={boardState.equityBoard}
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
          />
        </section>

        <section className="space-y-6">
          {mode === 'range' ? (
            <div className="grid gap-6 2xl:grid-cols-2">
              <HandGrid
                title="Hero Range Grid"
                compact
                rangeData={gridDataFromLabels(heroLabels)}
                selectedHands={heroLabels}
                onCellClick={(handLabel) => setHeroRangeText(toggleLabelInText(heroRangeText, handLabel))}
              />
              <HandGrid
                title="Villain Range Grid"
                compact
                rangeData={gridDataFromLabels(villainLabels)}
                selectedHands={villainLabels}
                onCellClick={(handLabel) => setVillainRangeText(toggleLabelInText(villainRangeText, handLabel))}
              />
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-panel rounded-3xl p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Hero Equity</p>
              <p className="mt-3 font-display text-5xl text-success">{result ? `${result.heroEquity.toFixed(1)}%` : '--'}</p>
              <p className="mt-2 text-sm text-muted">Confidence: {result ? `${result.confidence.low.toFixed(1)}% to ${result.confidence.high.toFixed(1)}%` : 'Run a simulation to populate.'}</p>
            </div>
            <div className="glass-panel rounded-3xl p-5">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Villain Equity</p>
              <p className="mt-3 font-display text-5xl text-gold">{result ? `${result.villainEquity.toFixed(1)}%` : '--'}</p>
              <p className="mt-2 text-sm text-muted">Iterations: {result ? result.iterations : '--'}</p>
              {mode === 'hand' && result ? <p className="mt-2 text-sm text-muted">{result.drawLabel} • {result.outs} outs • flop to river {result.flopToRiver}%</p> : null}
            </div>
          </div>

          <EquityChart data={result?.categoryBreakdown || []} />
        </section>
      </div>
    </div>
  );
};

export default EquityCalculator;