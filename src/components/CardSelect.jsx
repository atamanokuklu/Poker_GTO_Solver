import { CARD_RANKS, CARD_SUITS, SUIT_META, normalizeCardCode } from '../utils/cards';

const CardSelect = ({ value = '', onChange, excludedCards = [], placeholder = 'Select card', id }) => {
  const normalizedValue = normalizeCardCode(value);
  const activeRank = normalizedValue[0] || '';
  const activeSuitKey = normalizedValue[1] || '';
  const blocked = new Set(excludedCards.map(normalizeCardCode).filter(Boolean));
  const activeSuit = activeSuitKey ? SUIT_META[activeSuitKey] : null;
  const isBlockedSelection = activeRank && activeSuitKey && blocked.has(`${activeRank}${activeSuitKey}`) && normalizedValue !== `${activeRank}${activeSuitKey}`;

  const handleRankChange = (nextRank) => {
    if (!nextRank) {
      onChange?.('');
      return;
    }

    if (activeSuitKey && (!blocked.has(`${nextRank}${activeSuitKey}`) || normalizedValue === `${nextRank}${activeSuitKey}`)) {
      onChange?.(`${nextRank}${activeSuitKey}`);
      return;
    }

    const fallbackSuit = CARD_SUITS.find((suit) => !blocked.has(`${nextRank}${suit}`) || normalizedValue === `${nextRank}${suit}`);
    onChange?.(fallbackSuit ? `${nextRank}${fallbackSuit}` : '');
  };

  const handleSuitChange = (nextSuit) => {
    if (!activeRank || !nextSuit) {
      onChange?.('');
      return;
    }

    const nextCard = `${activeRank}${nextSuit}`;
    onChange?.(!blocked.has(nextCard) || normalizedValue === nextCard ? nextCard : '');
  };

  const availableSuits = CARD_SUITS.filter((suit) => !activeRank || !blocked.has(`${activeRank}${suit}`) || suit === activeSuitKey);

  return (
    <div className="rounded-3xl border border-gold/12 bg-surface/55 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted">{placeholder}</p>
          <p className="mt-1 text-xs text-muted">Choose rank and suit</p>
        </div>
        <div className="flex h-16 w-12 shrink-0 flex-col items-center justify-between rounded-2xl border border-black/10 bg-white px-2 py-2 shadow-[0_8px_20px_rgba(0,0,0,0.2)]">
          <span className={`text-sm font-semibold leading-none ${activeSuit?.textClass || 'text-slate-400'}`}>{activeRank || 'A'}</span>
          <span className={`text-lg leading-none ${activeSuit?.textClass || 'text-slate-300'}`}>{activeSuit?.icon || '＋'}</span>
          <span className={`text-[10px] leading-none ${activeSuit?.textClass || 'text-slate-300'}`}>{activeRank || ''}</span>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_1.15fr] gap-2">
        <select
          id={id}
          value={activeRank}
          onChange={(event) => handleRankChange(event.target.value)}
          className="w-full rounded-2xl border border-white/5 bg-felt px-3 py-2.5 text-sm text-ink outline-none"
        >
          <option value="">Rank</option>
          {CARD_RANKS.map((rank) => (
            <option key={rank} value={rank}>
              {rank}
            </option>
          ))}
        </select>

        <select
          value={activeSuitKey}
          disabled={!activeRank}
          onChange={(event) => handleSuitChange(event.target.value)}
          className="w-full rounded-2xl border border-white/5 bg-felt px-3 py-2.5 text-sm text-ink outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Suit</option>
          {availableSuits.map((suit) => (
            <option key={suit} value={suit}>
              {SUIT_META[suit].icon} {SUIT_META[suit].label}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-2 flex items-center justify-between gap-3 text-xs">
        <p className="text-muted">{normalizedValue ? `${activeRank}${activeSuit?.icon}` : 'No card selected'}</p>
        {isBlockedSelection ? (
          <p className="text-red-400">Card unavailable</p>
        ) : (
          <button type="button" onClick={() => onChange?.('')} className="text-muted transition hover:text-gold">
            Clear
          </button>
        )}
      </div>
    </div>
  );
};

export default CardSelect;