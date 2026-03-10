export const HAND_CATEGORIES = [
  'High Card',
  'Pair',
  'Two Pair',
  'Trips',
  'Straight',
  'Flush',
  'Full House',
  'Quads',
  'Straight Flush',
];

export const REFERENCE_HAND_MATCHUPS = {
  'AKs_vs_QQ': { hero: 46.1, villain: 53.9 },
  'AKo_vs_JJ': { hero: 43.2, villain: 56.8 },
  'A5s_vs_KQo': { hero: 50.4, villain: 49.6 },
  'T9s_vs_AKo': { hero: 42.7, villain: 57.3 },
  'QQ_vs_99': { hero: 80.3, villain: 19.7 },
  'AA_vs_KKs': { hero: 81.2, villain: 18.8 },
};

export const OUTS_REFERENCE = [
  { label: 'Open-ended straight draw', outs: 8, flopToRiver: 32, turnToRiver: 16 },
  { label: 'Flush draw', outs: 9, flopToRiver: 36, turnToRiver: 18 },
  { label: 'Combo draw', outs: 15, flopToRiver: 54, turnToRiver: 30 },
  { label: 'Two overs', outs: 6, flopToRiver: 24, turnToRiver: 12 },
  { label: 'Gutshot', outs: 4, flopToRiver: 16, turnToRiver: 8 },
];

export const XP_LEVELS = [
  { label: 'Fish', xp: 0 },
  { label: 'Shark', xp: 250 },
  { label: 'Reg', xp: 800 },
  { label: 'Crusher', xp: 1500 },
  { label: 'GTO Bot', xp: 2500 },
];