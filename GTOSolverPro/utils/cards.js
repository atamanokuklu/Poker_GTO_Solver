export const CARD_RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];
export const CARD_SUITS = ['s', 'h', 'd', 'c'];

export const SUIT_META = {
  s: { label: 'Spades', icon: '♠', textClass: 'text-black' },
  h: { label: 'Hearts', icon: '♥', textClass: 'text-red-600' },
  d: { label: 'Diamonds', icon: '♦', textClass: 'text-red-600' },
  c: { label: 'Clubs', icon: '♣', textClass: 'text-black' },
};

const HAND_RANK_ORDER = 'AKQJT98765432';

export const normalizeCardCode = (card) => {
  const trimmed = String(card || '').trim();

  if (!/^[2-9TJQKA][cdhs]$/i.test(trimmed)) {
    return '';
  }

  return `${trimmed[0].toUpperCase()}${trimmed[1].toLowerCase()}`;
};

export const CARD_OPTIONS = CARD_SUITS.flatMap((suit) =>
  CARD_RANKS.map((rank) => ({
    value: `${rank}${suit}`,
    label: `${rank}${SUIT_META[suit].icon} ${SUIT_META[suit].label}`,
  })),
);

export const cardsToHandLabel = (cards = []) => {
  const normalized = Array.from(new Set(cards.map(normalizeCardCode).filter(Boolean)));

  if (normalized.length !== 2) {
    return '';
  }

  const ranked = normalized
    .map((card) => ({ rank: card[0], suit: card[1] }))
    .sort((left, right) => HAND_RANK_ORDER.indexOf(left.rank) - HAND_RANK_ORDER.indexOf(right.rank));

  if (ranked[0].rank === ranked[1].rank) {
    return `${ranked[0].rank}${ranked[1].rank}`;
  }

  return `${ranked[0].rank}${ranked[1].rank}${ranked[0].suit === ranked[1].suit ? 's' : 'o'}`;
};