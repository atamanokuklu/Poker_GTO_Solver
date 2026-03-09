import { useMemo, useState } from 'react';
import HandGrid from '../components/HandGrid';
import { useAppContext } from '../context/AppContext';
import {
  ALL_HANDS,
  POSITIONS,
  SCENARIOS,
  applyTightnessToRange,
  getDefaultRange,
  getRangeKey,
  parseRangeText,
  serializeRange,
} from '../data/gtoRanges';

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

const RangeBuilder = () => {
  const {
    rangeState,
    updateRangeState,
    setRangeOverride,
    replaceRangeOverrides,
    resetRangeOverrides,
    pushToast,
  } = useAppContext();
  const [importText, setImportText] = useState('');
  const rangeKey = getRangeKey(rangeState.position, rangeState.scenario);
  const baseRange = getDefaultRange(rangeState.position, rangeState.scenario);
  const mergedRange = useMemo(
    () => ({ ...baseRange, ...(rangeState.overrides[rangeKey] || {}) }),
    [baseRange, rangeKey, rangeState.overrides],
  );
  const displayRange = useMemo(() => applyTightnessToRange(mergedRange, rangeState.tightness), [mergedRange, rangeState.tightness]);
  const stats = summaryStats(displayRange);

  const handleExport = async () => {
    const text = serializeRange(displayRange);
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      pushToast('Range exported to clipboard.', 'success');
      return;
    }

    pushToast('Clipboard API is unavailable in this browser.', 'error');
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
    <div className="module-shell space-y-6">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="glass-panel rounded-[28px] p-5">
          <div>
            <p className="text-xs uppercase tracking-[0.32em] text-muted">Range Builder</p>
            <h2 className="mt-2 font-display text-4xl text-gold">Preflop construction lab</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Switch seats, pressure scenarios, and tighten or widen the chart with immediate color feedback.</p>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">Position</p>
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map((position) => (
                  <button
                    key={position}
                    type="button"
                    onClick={() => updateRangeState({ position })}
                    className={`pressable rounded-full border px-3 py-2 text-xs ${
                      rangeState.position === position ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-muted'
                    }`}
                  >
                    {position}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.25em] text-muted">Scenario</p>
              <div className="flex flex-wrap gap-2">
                {SCENARIOS.map((scenario) => (
                  <button
                    key={scenario}
                    type="button"
                    onClick={() => updateRangeState({ scenario })}
                    className={`pressable rounded-full border px-3 py-2 text-xs ${
                      rangeState.scenario === scenario ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-muted'
                    }`}
                  >
                    {scenario}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-gold/15 bg-surface/70 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink">Range tightness</p>
                <p className="text-sm text-gold">{rangeState.tightness}%</p>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={rangeState.tightness}
                onChange={(event) => updateRangeState({ tightness: Number(event.target.value) })}
                className="mt-3 w-full accent-[#c9a84c]"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleExport}
                className="pressable rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold"
              >
                Export Range
              </button>
              <button
                type="button"
                onClick={() => {
                  resetRangeOverrides(rangeKey);
                  updateRangeState({ tightness: 68 });
                  pushToast('Range reset to GTO default.', 'info');
                }}
                className="pressable rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm text-ink"
              >
                Reset to GTO Default
              </button>
            </div>

            <div className="rounded-2xl border border-white/5 bg-surface/70 p-4">
              <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Import comma-separated hands</label>
              <textarea
                rows="4"
                value={importText}
                onChange={(event) => setImportText(event.target.value)}
                placeholder="AA, AKs, KQo, 76s"
                className="w-full rounded-2xl border border-white/5 bg-felt px-3 py-3 text-sm text-ink outline-none placeholder:text-muted"
              />
              <button type="button" onClick={handleImport} className="pressable mt-3 rounded-2xl border border-gold/20 bg-panel px-4 py-2 text-sm text-ink">
                Import Range
              </button>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: 'Hands Included', value: `${stats.openRate}%` },
              { label: 'Raise Weight', value: `${stats.raiseWeight}%` },
              { label: 'Call Weight', value: `${stats.callWeight}%` },
              { label: 'Mixed Cells', value: stats.mixedCells },
            ].map((card) => (
              <div key={card.label} className="glass-panel rounded-3xl p-4">
                <p className="text-xs uppercase tracking-[0.25em] text-muted">{card.label}</p>
                <p className="mt-3 font-display text-3xl text-gold">{card.value}</p>
              </div>
            ))}
          </div>

          <HandGrid
            rangeData={displayRange}
            title={`${rangeState.position} • ${rangeState.scenario}`}
            subtitle="Click cells to cycle Raise → Call → Mixed → Fold overrides. Hover any hand for exact action frequencies."
            onCellClick={(handLabel, profile) => setRangeOverride(rangeKey, handLabel, cycleProfile(profile))}
          />
        </section>
      </div>
    </div>
  );
};

export default RangeBuilder;