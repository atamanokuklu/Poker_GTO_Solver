import { HAND_MATRIX } from '../data/gtoRanges';

const actionLabel = (profile) => {
  const entries = [
    ['Raise', profile?.raise || 0],
    ['Call', profile?.call || 0],
    ['Fold', profile?.fold ?? 1],
  ].sort((left, right) => right[1] - left[1]);

  if ((profile?.raise || 0) > 0 && (profile?.call || 0) > 0) {
    return 'Mixed';
  }

  return entries[0][0];
};

const cellBackground = (profile, selected) => {
  if (selected) {
    return 'bg-gold/20 border-gold/50 text-ink shadow-[0_0_0_1px_rgba(201,168,76,0.28)]';
  }

  const raise = profile?.raise || 0;
  const call = profile?.call || 0;

  if (raise > 0.05 && call > 0.05) {
    return 'border-gold/20 bg-gradient-to-br from-danger/85 via-danger/55 to-sky-500/70 text-white';
  }

  if (raise >= call && raise > 0.05) {
    return 'border-danger/30 bg-danger/75 text-white';
  }

  if (call > 0.05) {
    return 'border-sky-400/30 bg-sky-500/65 text-white';
  }

  return 'border-white/5 bg-surface/90 text-muted';
};

const formatFrequencies = (profile = { raise: 0, call: 0, fold: 1 }) => [
  `Raise ${(profile.raise || 0) * 100}%`,
  `Call ${(profile.call || 0) * 100}%`,
  `Fold ${(profile.fold ?? 1) * 100}%`,
];

const HandGrid = ({ rangeData = {}, selectedHands = [], onCellClick, title = 'Grid', subtitle, compact = false }) => {
  const selectedSet = new Set(selectedHands);

  return (
    <div className="glass-panel rounded-3xl p-4">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl text-gold">{title}</h3>
          {subtitle ? <p className="mt-1 text-xs text-muted">{subtitle}</p> : null}
        </div>
        <div className="text-right text-xs text-muted">
          <p>Raise = red</p>
          <p>Call = blue</p>
          <p>Mixed = blended</p>
        </div>
      </div>

      <div className={`grid grid-cols-[repeat(13,minmax(0,1fr))] gap-1 ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {HAND_MATRIX.flat().map((handLabel) => {
          const profile = rangeData[handLabel] || { raise: 0, call: 0, fold: 1 };
          const selected = selectedSet.has(handLabel);
          return (
            <button
              key={handLabel}
              type="button"
              className={`group pressable relative aspect-square rounded-lg border px-1 py-1 text-left transition hover:-translate-y-0.5 ${cellBackground(profile, selected)}`}
              onClick={() => onCellClick?.(handLabel, profile)}
            >
              <span className="block text-[11px] font-semibold">{handLabel}</span>
              <span className="block truncate text-[9px] opacity-75">{actionLabel(profile)}</span>

              <span className="pointer-events-none absolute bottom-full left-1/2 z-10 hidden w-36 -translate-x-1/2 rounded-xl border border-gold/20 bg-felt/95 p-2 text-left text-[10px] text-ink shadow-xl group-hover:block">
                <span className="mb-1 block text-gold">{handLabel}</span>
                {formatFrequencies(profile).map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default HandGrid;