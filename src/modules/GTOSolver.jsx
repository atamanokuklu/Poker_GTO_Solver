import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import ActionTree from '../components/ActionTree';
import CardSelect from '../components/CardSelect';
import { useAppContext } from '../context/AppContext';
import { POSITIONS, getDefaultRange } from '../data/gtoRanges';
import { normalizeCardCode } from '../utils/cards';
import { MDF, SPR, bluffRatio, deriveSolverSnapshot, potOdds } from '../utils/pokerMath';

const STREETS = ['Preflop', 'Flop', 'Turn', 'River'];
const BET_SIZES = [33, 50, 75, 100, 150, 250];

const normalizeBoard = (cards) => {
  const used = new Set();
  return cards
    .map(normalizeCardCode)
    .filter(Boolean)
    .filter((card) => {
      if (used.has(card)) {
        return false;
      }
      used.add(card);
      return true;
    });
};

const GTOSolver = () => {
  const { boardState, updateBoardState } = useAppContext();
  const [street, setStreet] = useState('Flop');
  const [heroPosition, setHeroPosition] = useState('BTN');
  const [villainPosition, setVillainPosition] = useState('BB');
  const [heroStack, setHeroStack] = useState(100);
  const [villainStack, setVillainStack] = useState(100);
  const [potSize, setPotSize] = useState(12);
  const [selectedBetSizes, setSelectedBetSizes] = useState([33, 75, 100]);

  const boardCards = normalizeBoard(boardState.solverBoard);
  const heroRange = getDefaultRange(heroPosition, 'RFI');
  const villainRange = getDefaultRange(villainPosition, villainPosition === 'BB' ? 'vs 3bet' : 'RFI');
  const snapshot = useMemo(
    () =>
      deriveSolverSnapshot({
        range: heroRange,
        villainRange,
        boardCards,
        betSizeOptions: selectedBetSizes,
        potSize,
        street,
        heroPosition,
        villainPosition,
      }),
    [boardCards, heroPosition, heroRange, potSize, selectedBetSizes, street, villainPosition, villainRange],
  );

  const referenceBetSize = snapshot.recommendedSizing.size === 250 ? heroStack : (potSize * snapshot.recommendedSizing.size) / 100;
  const mathCards = [
    { label: 'Pot Odds', value: `${(potOdds(referenceBetSize, potSize) * 100).toFixed(1)}%` },
    { label: 'MDF', value: `${(MDF(referenceBetSize, potSize) * 100).toFixed(1)}%` },
    { label: 'Bluff Ratio', value: `${(bluffRatio(potOdds(referenceBetSize, potSize)) * 100).toFixed(1)}%` },
    { label: 'SPR', value: SPR(Math.min(heroStack, villainStack), potSize).toFixed(2) },
  ];

  const evData = [
    ...snapshot.sizingSummary.map((item) => ({ label: item.size === 250 ? 'All-In' : `${item.size}%`, ev: Number(item.ev.toFixed(2)) })),
    { label: 'Check', ev: Number((snapshot.rows.reduce((sum, row) => sum + row.checkEV, 0) / (snapshot.rows.length || 1)).toFixed(2)) },
    { label: 'Fold', ev: 0 },
  ];

  return (
    <div className="module-shell grid gap-6 xl:grid-cols-[380px_1fr]">
      <section className="glass-panel rounded-[28px] p-5">
        <p className="text-xs uppercase tracking-[0.32em] text-muted">GTO Solver</p>
        <h2 className="mt-2 font-display text-4xl text-gold">Board-aware approximation</h2>
        <p className="mt-3 text-sm leading-6 text-muted">The solver uses pot odds, MDF, bluff ratios, nut advantage, and polarized range heuristics to build a playable strategy tree client-side.</p>

        <div className="mt-6 space-y-5">
          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Street</label>
            <div className="grid grid-cols-2 gap-2">
              {STREETS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setStreet(item)}
                  className={`pressable rounded-2xl border px-3 py-3 text-sm ${street === item ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-muted'}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Board cards</label>
            <div className="grid gap-3 min-[360px]:grid-cols-2">
              {boardState.solverBoard.map((card, index) => (
                <CardSelect
                  key={`board-${index}`}
                  value={card}
                  placeholder={['Flop 1', 'Flop 2', 'Flop 3', 'Turn', 'River'][index]}
                  excludedCards={boardState.solverBoard.filter((_, itemIndex) => itemIndex !== index)}
                  onChange={(nextCard) => {
                    const next = [...boardState.solverBoard];
                    next[index] = nextCard;
                    updateBoardState('solverBoard', next);
                  }}
                />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Hero</label>
              <select value={heroPosition} onChange={(event) => setHeroPosition(event.target.value)} className="w-full rounded-2xl border border-white/5 bg-surface px-3 py-3 text-sm text-ink outline-none">
                {POSITIONS.map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Villain</label>
              <select value={villainPosition} onChange={(event) => setVillainPosition(event.target.value)} className="w-full rounded-2xl border border-white/5 bg-surface px-3 py-3 text-sm text-ink outline-none">
                {POSITIONS.map((position) => (
                  <option key={position}>{position}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/5 bg-surface/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink">Hero stack</p>
                <p className="text-sm text-gold">{heroStack}bb</p>
              </div>
              <input type="range" min="20" max="300" value={heroStack} onChange={(event) => setHeroStack(Number(event.target.value))} className="mt-3 w-full accent-[#c9a84c]" />
            </div>
            <div className="rounded-2xl border border-white/5 bg-surface/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink">Villain stack</p>
                <p className="text-sm text-gold">{villainStack}bb</p>
              </div>
              <input type="range" min="20" max="300" value={villainStack} onChange={(event) => setVillainStack(Number(event.target.value))} className="mt-3 w-full accent-[#c9a84c]" />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Pot size (bb)</label>
            <input type="number" min="1" value={potSize} onChange={(event) => setPotSize(Number(event.target.value) || 1)} className="w-full rounded-2xl border border-white/5 bg-surface px-3 py-3 text-sm text-ink outline-none" />
          </div>

          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">Bet sizing options</p>
            <div className="grid grid-cols-2 gap-2">
              {BET_SIZES.map((size) => {
                const enabled = selectedBetSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() =>
                      setSelectedBetSizes((current) =>
                        enabled ? current.filter((item) => item !== size) : [...current, size].sort((left, right) => left - right),
                      )
                    }
                    className={`pressable rounded-2xl border px-3 py-3 text-sm ${enabled ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-muted'}`}
                  >
                    {size === 250 ? 'All-In' : `${size}%`}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {mathCards.map((card) => (
            <div key={card.label} className="glass-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">{card.label}</p>
              <p className="mt-3 font-display text-3xl text-gold">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl text-gold">Recommended sizing</h3>
                  <p className="mt-1 text-xs text-muted">Highest aggregate EV across the active sizing tree.</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-4xl text-gold">{snapshot.recommendedSizing.size === 250 ? 'All-In' : `${snapshot.recommendedSizing.size}%`}</p>
                  <p className="text-sm text-muted">EV {snapshot.recommendedSizing.ev.toFixed(2)}bb</p>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <div className={`rounded-2xl border px-4 py-4 ${snapshot.rangeAdvantage.leader === 'Hero' ? 'border-success/30 bg-success/10' : 'border-danger/30 bg-danger/10'}`}>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Range Advantage</p>
                  <p className="mt-2 text-lg text-ink">{snapshot.rangeAdvantage.leader}</p>
                  <p className="text-sm text-muted">Edge {snapshot.rangeAdvantage.nutAdvantagePct.toFixed(1)} on {snapshot.rangeAdvantage.texture}</p>
                </div>
                <div className="rounded-2xl border border-gold/15 bg-surface/70 px-4 py-4">
                  <p className="text-xs uppercase tracking-[0.25em] text-muted">Mixed Strategy</p>
                  <p className="mt-2 text-lg text-ink">{snapshot.rows.find((row) => row.betPct > 0.2 && row.betPct < 0.8)?.label || 'A5s'}</p>
                  <p className="text-sm text-muted">{snapshot.rows.find((row) => row.betPct > 0.2 && row.betPct < 0.8)?.mixText || 'Bet 60% / Check 40%'}</p>
                </div>
              </div>
            </div>

            <div className="glass-panel rounded-3xl p-4">
              <div className="mb-4">
                <h3 className="font-display text-2xl text-gold">Action Frequency Table</h3>
                <p className="mt-1 text-xs text-muted">Top range rows with heuristic mix, EV, and preferred size.</p>
              </div>

              <div className="max-h-[420px] overflow-auto rounded-2xl border border-white/5">
                <table className="min-w-full text-sm">
                  <thead className="bg-surface text-left text-xs uppercase tracking-[0.2em] text-muted">
                    <tr>
                      {['Hand', 'Bet', 'Check', 'Raise', 'Fold', 'Best Size', 'EV'].map((header) => (
                        <th key={header} className="px-4 py-3">{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {snapshot.rows.slice(0, 28).map((row) => (
                      <tr key={row.label} className="border-t border-white/5 text-ink">
                        <td className="px-4 py-3 font-semibold text-gold">{row.label}</td>
                        <td className="px-4 py-3">{Math.round(row.betPct * 100)}%</td>
                        <td className="px-4 py-3">{Math.round(row.checkPct * 100)}%</td>
                        <td className="px-4 py-3">{Math.round(row.raisePct * 100)}%</td>
                        <td className="px-4 py-3">{Math.round(row.foldPct * 100)}%</td>
                        <td className="px-4 py-3">{row.bestSize === 250 ? 'All-In' : `${row.bestSize}%`}</td>
                        <td className="px-4 py-3">{row.bestEV.toFixed(2)}bb</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass-panel rounded-3xl p-4">
              <div className="mb-4">
                <h3 className="font-display text-2xl text-gold">EV Comparison</h3>
                <p className="mt-1 text-xs text-muted">Aggregate EV for the selected bet tree versus passive options.</p>
              </div>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evData} margin={{ top: 8, right: 10, left: 0, bottom: 4 }}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fill: '#89a28f', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#89a28f', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#111a14', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '18px' }} />
                    <Bar dataKey="ev" fill="#c9a84c" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <ActionTree tree={snapshot.nodeTree} />
          </div>
        </div>
      </section>
    </div>
  );
};

export default GTOSolver;