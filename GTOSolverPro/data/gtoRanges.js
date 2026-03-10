const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'];

const RANK_VALUES = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  T: 10,
  9: 9,
  8: 8,
  7: 7,
  6: 6,
  5: 5,
  4: 4,
  3: 3,
  2: 2,
};

export const POSITIONS = ['UTG', 'UTG+1', 'MP', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
export const SCENARIOS = ['RFI', 'vs 3bet', 'vs 4bet', 'Facing Squeeze'];

const POSITION_KEYS = {
  UTG: 'UTG',
  'UTG+1': 'UTG1',
  MP: 'MP',
  HJ: 'HJ',
  CO: 'CO',
  BTN: 'BTN',
  SB: 'SB',
  BB: 'BB',
};

const SCENARIO_KEYS = {
  RFI: 'RFI',
  'vs 3bet': 'VS_3BET',
  'vs 4bet': 'VS_4BET',
  'Facing Squeeze': 'FACING_SQUEEZE',
};

export const HAND_MATRIX = RANKS.map((rowRank, rowIndex) =>
  RANKS.map((columnRank, columnIndex) => {
    if (rowIndex === columnIndex) {
      return `${rowRank}${columnRank}`;
    }

    if (rowIndex < columnIndex) {
      return `${rowRank}${columnRank}s`;
    }

    return `${columnRank}${rowRank}o`;
  }),
);

export const ALL_HANDS = HAND_MATRIX.flat();

export const getRangeKey = (position, scenario) => `${POSITION_KEYS[position]}_${SCENARIO_KEYS[scenario]}`;

export const normalizeHandLabel = (input) => {
  const raw = (input || '').trim().toUpperCase();

  if (!raw) {
    return null;
  }

  if (/^[AKQJT98765432]{2}$/.test(raw) && raw[0] === raw[1]) {
    return raw;
  }

  if (/^[AKQJT98765432]{2}[SO]$/.test(raw) && raw[0] !== raw[1]) {
    const ranks = raw.slice(0, 2).split('');
    const ordered = ranks.sort((left, right) => RANK_VALUES[right] - RANK_VALUES[left]).join('');
    return `${ordered}${raw[2].toLowerCase()}`;
  }

  return null;
};

export const handLabelScore = (label) => {
  const normalized = normalizeHandLabel(label);

  if (!normalized) {
    return 0;
  }

  const [firstRank, secondRank] = normalized;
  const firstValue = RANK_VALUES[firstRank];
  const secondValue = RANK_VALUES[secondRank];
  const gap = Math.abs(firstValue - secondValue);
  const suited = normalized.endsWith('s');
  const pair = firstRank === secondRank;
  const broadwayBonus = firstValue >= 10 && secondValue >= 10 ? 7 : 0;
  const wheelBonus = firstValue === 14 && secondValue <= 5 ? 4 : 0;
  const connectivityBonus = gap === 1 ? 8 : gap === 2 ? 4 : gap === 3 ? 1 : -Math.min(8, gap);

  if (pair) {
    return Math.min(100, 58 + firstValue * 2.85 + (firstValue >= 11 ? 8 : 0));
  }

  const suitedBonus = suited ? 9 : 1;
  const aceBonus = firstValue === 14 || secondValue === 14 ? 4 : 0;
  const score = firstValue * 3.35 + secondValue * 2.2 + suitedBonus + broadwayBonus + connectivityBonus + aceBonus + wheelBonus;

  return Math.max(4, Math.min(98, score));
};

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const normalizeActionProfile = (profile) => {
  const raise = clamp(profile.raise || 0);
  const call = clamp(profile.call || 0);
  const fold = clamp(profile.fold ?? 0);
  const total = raise + call + fold;

  if (total <= 0) {
    return { raise: 0, call: 0, fold: 1 };
  }

  return {
    raise: raise / total,
    call: call / total,
    fold: fold / total,
  };
};

const buildActionProfile = (score, profile) => {
  const { raiseThreshold, callThreshold, bluffThreshold, aggression = 1, defense = 1 } = profile;

  if (score >= raiseThreshold + 6) {
    return normalizeActionProfile({ raise: 1, call: 0, fold: 0 });
  }

  if (score >= raiseThreshold) {
    const pressure = clamp((score - raiseThreshold) / 6);
    const raise = clamp(0.58 + pressure * 0.32 * aggression);
    const call = clamp(0.42 - pressure * 0.18);
    const fold = clamp(1 - raise - call);
    return normalizeActionProfile({ raise, call, fold });
  }

  if (score >= callThreshold + 5) {
    const call = clamp(0.88 * defense + 0.08);
    const raise = clamp((aggression - 1) * 0.18, 0, 0.18);
    return normalizeActionProfile({ raise, call: clamp(call - raise), fold: clamp(1 - raise - (call - raise)) });
  }

  if (score >= callThreshold) {
    const stability = clamp((score - callThreshold) / 5);
    const raise = clamp(stability * 0.22 * aggression, 0, 0.28);
    const call = clamp(0.38 + stability * 0.34 * defense);
    const fold = clamp(1 - raise - call);
    return normalizeActionProfile({ raise, call, fold });
  }

  if (score >= bluffThreshold) {
    const raise = clamp(0.14 + (aggression - 1) * 0.08, 0.08, 0.26);
    return normalizeActionProfile({ raise, call: 0, fold: clamp(1 - raise) });
  }

  return normalizeActionProfile({ raise: 0, call: 0, fold: 1 });
};

const PROFILE_TABLE = {
  UTG: {
    RFI: { raiseThreshold: 76, callThreshold: 70, bluffThreshold: 64, aggression: 1.06, defense: 0.92 },
    'vs 3bet': { raiseThreshold: 84, callThreshold: 75, bluffThreshold: 70, aggression: 0.92, defense: 0.86 },
    'vs 4bet': { raiseThreshold: 91, callThreshold: 84, bluffThreshold: 78, aggression: 0.74, defense: 0.7 },
    'Facing Squeeze': { raiseThreshold: 82, callThreshold: 74, bluffThreshold: 67, aggression: 0.96, defense: 0.82 },
  },
  'UTG+1': {
    RFI: { raiseThreshold: 74, callThreshold: 68, bluffThreshold: 62, aggression: 1.06, defense: 0.94 },
    'vs 3bet': { raiseThreshold: 82, callThreshold: 74, bluffThreshold: 68, aggression: 0.94, defense: 0.9 },
    'vs 4bet': { raiseThreshold: 90, callThreshold: 82, bluffThreshold: 75, aggression: 0.76, defense: 0.72 },
    'Facing Squeeze': { raiseThreshold: 80, callThreshold: 72, bluffThreshold: 66, aggression: 0.98, defense: 0.85 },
  },
  MP: {
    RFI: { raiseThreshold: 72, callThreshold: 66, bluffThreshold: 60, aggression: 1.08, defense: 0.96 },
    'vs 3bet': { raiseThreshold: 80, callThreshold: 72, bluffThreshold: 66, aggression: 0.96, defense: 0.92 },
    'vs 4bet': { raiseThreshold: 88, callThreshold: 80, bluffThreshold: 74, aggression: 0.8, defense: 0.72 },
    'Facing Squeeze': { raiseThreshold: 78, callThreshold: 70, bluffThreshold: 64, aggression: 1, defense: 0.88 },
  },
  HJ: {
    RFI: { raiseThreshold: 69, callThreshold: 63, bluffThreshold: 57, aggression: 1.1, defense: 1 },
    'vs 3bet': { raiseThreshold: 78, callThreshold: 70, bluffThreshold: 64, aggression: 0.98, defense: 0.94 },
    'vs 4bet': { raiseThreshold: 86, callThreshold: 78, bluffThreshold: 72, aggression: 0.82, defense: 0.74 },
    'Facing Squeeze': { raiseThreshold: 76, callThreshold: 68, bluffThreshold: 61, aggression: 1.02, defense: 0.9 },
  },
  CO: {
    RFI: { raiseThreshold: 65, callThreshold: 58, bluffThreshold: 52, aggression: 1.14, defense: 1.02 },
    'vs 3bet': { raiseThreshold: 74, callThreshold: 66, bluffThreshold: 60, aggression: 1.02, defense: 0.96 },
    'vs 4bet': { raiseThreshold: 84, callThreshold: 76, bluffThreshold: 70, aggression: 0.84, defense: 0.78 },
    'Facing Squeeze': { raiseThreshold: 72, callThreshold: 64, bluffThreshold: 58, aggression: 1.04, defense: 0.94 },
  },
  BTN: {
    RFI: { raiseThreshold: 60, callThreshold: 52, bluffThreshold: 46, aggression: 1.18, defense: 1.04 },
    'vs 3bet': { raiseThreshold: 70, callThreshold: 60, bluffThreshold: 54, aggression: 1.08, defense: 0.98 },
    'vs 4bet': { raiseThreshold: 82, callThreshold: 72, bluffThreshold: 66, aggression: 0.88, defense: 0.8 },
    'Facing Squeeze': { raiseThreshold: 69, callThreshold: 59, bluffThreshold: 53, aggression: 1.08, defense: 0.96 },
  },
  SB: {
    RFI: { raiseThreshold: 62, callThreshold: 54, bluffThreshold: 47, aggression: 1.2, defense: 0.96 },
    'vs 3bet': { raiseThreshold: 72, callThreshold: 63, bluffThreshold: 57, aggression: 1.08, defense: 0.9 },
    'vs 4bet': { raiseThreshold: 84, callThreshold: 74, bluffThreshold: 68, aggression: 0.86, defense: 0.76 },
    'Facing Squeeze': { raiseThreshold: 71, callThreshold: 61, bluffThreshold: 55, aggression: 1.04, defense: 0.9 },
  },
  BB: {
    RFI: { raiseThreshold: 68, callThreshold: 50, bluffThreshold: 44, aggression: 0.92, defense: 1.2 },
    'vs 3bet': { raiseThreshold: 78, callThreshold: 58, bluffThreshold: 52, aggression: 0.88, defense: 1.14 },
    'vs 4bet': { raiseThreshold: 86, callThreshold: 68, bluffThreshold: 60, aggression: 0.8, defense: 1.02 },
    'Facing Squeeze': { raiseThreshold: 74, callThreshold: 56, bluffThreshold: 50, aggression: 0.86, defense: 1.08 },
  },
};

export const createRangeFromProfile = (profile) =>
  ALL_HANDS.reduce((accumulator, handLabel) => {
    accumulator[handLabel] = buildActionProfile(handLabelScore(handLabel), profile);
    return accumulator;
  }, {});

export const gtoRanges = Object.entries(PROFILE_TABLE).reduce((accumulator, [position, scenarios]) => {
  Object.entries(scenarios).forEach(([scenario, profile]) => {
    accumulator[getRangeKey(position, scenario)] = createRangeFromProfile(profile);
  });
  return accumulator;
}, {});

export const serializeRange = (range) =>
  ALL_HANDS.filter((handLabel) => {
    const action = range[handLabel] || { raise: 0, call: 0, fold: 1 };
    return action.raise + action.call > 0.01;
  }).join(', ');

export const parseRangeText = (text) =>
  Array.from(
    new Set(
      (text || '')
        .split(',')
        .map((chunk) => normalizeHandLabel(chunk))
        .filter(Boolean),
    ),
  );

export const applyTightnessToRange = (range, tightness) => {
  const keepCount = Math.max(0, Math.round((tightness / 100) * ALL_HANDS.length));
  const allowedHands = new Set(
    [...ALL_HANDS].sort((left, right) => handLabelScore(right) - handLabelScore(left)).slice(0, keepCount),
  );

  return ALL_HANDS.reduce((accumulator, handLabel) => {
    accumulator[handLabel] = allowedHands.has(handLabel) ? range[handLabel] || { raise: 0, call: 0, fold: 1 } : { raise: 0, call: 0, fold: 1 };
    return accumulator;
  }, {});
};

export const getDefaultRange = (position, scenario) => gtoRanges[getRangeKey(position, scenario)] || gtoRanges.CO_RFI;