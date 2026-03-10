const RANK_ORDER = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS = ['c', 'd', 'h', 's'];

const RANK_TO_VALUE = RANK_ORDER.reduce((accumulator, rank, index) => {
  accumulator[rank] = index + 2;
  return accumulator;
}, {});

const CATEGORY_NAMES = ['High Card', 'Pair', 'Two Pair', 'Trips', 'Straight', 'Flush', 'Full House', 'Quads', 'Straight Flush'];

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const combinations = (items, choose) => {
  const results = [];

  const recurse = (start, path) => {
    if (path.length === choose) {
      results.push(path);
      return;
    }

    for (let index = start; index <= items.length - (choose - path.length); index += 1) {
      recurse(index + 1, [...path, items[index]]);
    }
  };

  recurse(0, []);
  return results;
};

const encodeTiebreakers = (values) =>
  values.reduce((accumulator, value, index) => accumulator + value * 15 ** (5 - index), 0);

const getStraightHigh = (values) => {
  const unique = [...new Set(values)].sort((left, right) => right - left);

  if (unique.includes(14)) {
    unique.push(1);
  }

  for (let index = 0; index <= unique.length - 5; index += 1) {
    const window = unique.slice(index, index + 5);
    if (window.every((value, offset) => offset === 0 || value === window[offset - 1] - 1)) {
      return window[0] === 1 ? 5 : window[0];
    }
  }

  return null;
};

const compareTiebreakers = (left, right) => {
  const maxLength = Math.max(left.length, right.length);

  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = left[index] || 0;
    const rightValue = right[index] || 0;

    if (leftValue !== rightValue) {
      return leftValue > rightValue ? 1 : -1;
    }
  }

  return 0;
};

const toScaledRank = (category, tiebreakers) => {
  const baseScore = category * 200000 + encodeTiebreakers(tiebreakers);
  const normalized = clamp(baseScore / 2200000, 0, 1);
  return Math.max(1, Math.min(7462, Math.round(7462 - normalized * 7461)));
};

export const parseCard = (code) => {
  const trimmed = (code || '').trim();

  if (!/^[2-9TJQKA][cdhs]$/i.test(trimmed)) {
    return null;
  }

  const rank = trimmed[0].toUpperCase();
  const suit = trimmed[1].toLowerCase();

  return {
    code: `${rank}${suit}`,
    rank,
    suit,
    value: RANK_TO_VALUE[rank],
  };
};

export const createDeck = (excludedCards = []) => {
  const excluded = new Set(excludedCards.map((card) => parseCard(card)?.code).filter(Boolean));
  return RANK_ORDER.flatMap((rank) => SUITS.map((suit) => `${rank}${suit}`)).filter((card) => !excluded.has(card));
};

export const normalizeHandLabel = (input) => {
  const raw = (input || '').trim().toUpperCase();

  if (/^[AKQJT98765432]{2}$/.test(raw) && raw[0] === raw[1]) {
    return raw;
  }

  if (/^[AKQJT98765432]{2}[SO]$/.test(raw) && raw[0] !== raw[1]) {
    const ranks = raw.slice(0, 2).split('').sort((left, right) => RANK_TO_VALUE[right] - RANK_TO_VALUE[left]);
    return `${ranks.join('')}${raw[2].toLowerCase()}`;
  }

  return null;
};

export const handLabelToCombos = (label, excludedCards = []) => {
  const normalized = normalizeHandLabel(label);

  if (!normalized) {
    return [];
  }

  const excluded = new Set(excludedCards.map((card) => parseCard(card)?.code).filter(Boolean));
  const [firstRank, secondRank] = normalized;
  const pair = firstRank === secondRank;
  const suitedness = normalized[2];
  const combos = [];

  if (pair) {
    for (let firstIndex = 0; firstIndex < SUITS.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < SUITS.length; secondIndex += 1) {
        combos.push([`${firstRank}${SUITS[firstIndex]}`, `${secondRank}${SUITS[secondIndex]}`]);
      }
    }
  } else if (suitedness === 's') {
    SUITS.forEach((suit) => {
      combos.push([`${firstRank}${suit}`, `${secondRank}${suit}`]);
    });
  } else if (suitedness === 'o') {
    SUITS.forEach((firstSuit) => {
      SUITS.forEach((secondSuit) => {
        if (firstSuit !== secondSuit) {
          combos.push([`${firstRank}${firstSuit}`, `${secondRank}${secondSuit}`]);
        }
      });
    });
  } else {
    return [...handLabelToCombos(`${firstRank}${secondRank}s`, excludedCards), ...handLabelToCombos(`${firstRank}${secondRank}o`, excludedCards)];
  }

  return combos.filter(([left, right]) => !excluded.has(left) && !excluded.has(right) && left !== right);
};

export const pickRepresentativeCombo = (label, excludedCards = []) => handLabelToCombos(label, excludedCards)[0] || null;

export const evaluateFiveCardHand = (cardCodes) => {
  const cards = cardCodes.map(parseCard).filter(Boolean).sort((left, right) => right.value - left.value);

  if (cards.length !== 5) {
    return null;
  }

  const values = cards.map((card) => card.value);
  const suits = cards.map((card) => card.suit);
  const counts = values.reduce((accumulator, value) => {
    accumulator[value] = (accumulator[value] || 0) + 1;
    return accumulator;
  }, {});

  const groups = Object.entries(counts)
    .map(([value, count]) => ({ value: Number(value), count }))
    .sort((left, right) => right.count - left.count || right.value - left.value);

  const flush = new Set(suits).size === 1;
  const straightHigh = getStraightHigh(values);
  let category = 0;
  let tiebreakers = [...values];

  if (flush && straightHigh) {
    category = 8;
    tiebreakers = [straightHigh];
  } else if (groups[0].count === 4) {
    category = 7;
    tiebreakers = [groups[0].value, groups[1].value];
  } else if (groups[0].count === 3 && groups[1].count === 2) {
    category = 6;
    tiebreakers = [groups[0].value, groups[1].value];
  } else if (flush) {
    category = 5;
    tiebreakers = [...values];
  } else if (straightHigh) {
    category = 4;
    tiebreakers = [straightHigh];
  } else if (groups[0].count === 3) {
    category = 3;
    tiebreakers = [groups[0].value, ...groups.slice(1).map((group) => group.value).sort((left, right) => right - left)];
  } else if (groups[0].count === 2 && groups[1].count === 2) {
    category = 2;
    tiebreakers = [Math.max(groups[0].value, groups[1].value), Math.min(groups[0].value, groups[1].value), groups[2].value];
  } else if (groups[0].count === 2) {
    category = 1;
    tiebreakers = [groups[0].value, ...groups.slice(1).map((group) => group.value).sort((left, right) => right - left)];
  }

  const score = category * 10000000 + encodeTiebreakers(tiebreakers);

  return {
    category,
    categoryName: CATEGORY_NAMES[category],
    tiebreakers,
    score,
    rank: toScaledRank(category, tiebreakers),
    bestFive: cards.map((card) => card.code),
  };
};

export const compareEvaluations = (left, right) => {
  if (!left || !right) {
    return 0;
  }

  if (left.category !== right.category) {
    return left.category > right.category ? 1 : -1;
  }

  return compareTiebreakers(left.tiebreakers, right.tiebreakers);
};

export const evaluateSevenCardHand = (cardCodes) => {
  const uniqueCards = [...new Set(cardCodes.map((card) => parseCard(card)?.code).filter(Boolean))];

  if (uniqueCards.length < 5) {
    return null;
  }

  return combinations(uniqueCards, 5).reduce((bestEvaluation, combo) => {
    const candidate = evaluateFiveCardHand(combo);
    if (!bestEvaluation || compareEvaluations(candidate, bestEvaluation) > 0) {
      return candidate;
    }
    return bestEvaluation;
  }, null);
};

export const compareHands = (heroCards, villainCards, boardCards = []) => {
  const heroEvaluation = evaluateSevenCardHand([...heroCards, ...boardCards]);
  const villainEvaluation = evaluateSevenCardHand([...villainCards, ...boardCards]);
  return compareEvaluations(heroEvaluation, villainEvaluation);
};

export const cardsConflict = (leftCards, rightCards) => {
  const seen = new Set(leftCards);
  return rightCards.some((card) => seen.has(card));
};

export const estimateDrawOuts = (holeCards, boardCards) => {
  const combined = [...holeCards, ...boardCards].map(parseCard).filter(Boolean);

  if (combined.length < 5) {
    return { outs: 0, label: 'No draw', flopToRiver: 0, turnToRiver: 0 };
  }

  const evaluation = evaluateSevenCardHand([...holeCards, ...boardCards]);
  const suitCounts = combined.reduce((accumulator, card) => {
    accumulator[card.suit] = (accumulator[card.suit] || 0) + 1;
    return accumulator;
  }, {});

  let outs = 0;
  let label = 'No draw';

  if ((evaluation?.category || 0) < 5 && Object.values(suitCounts).some((count) => count === 4)) {
    outs = Math.max(outs, 9);
    label = 'Flush draw';
  }

  const rankValues = [...new Set(combined.map((card) => card.value))].sort((left, right) => left - right);
  if (rankValues.includes(14)) {
    rankValues.unshift(1);
  }

  for (let start = 1; start <= 10; start += 1) {
    const window = [start, start + 1, start + 2, start + 3, start + 4];
    const hits = window.filter((value) => rankValues.includes(value));

    if (hits.length === 4) {
      const missing = window.find((value) => !hits.includes(value));
      if (missing === start || missing === start + 4) {
        if (outs < 8) {
          outs = 8;
          label = 'Open-ended straight draw';
        }
      } else if (outs < 4) {
        outs = 4;
        label = 'Gutshot straight draw';
      }
    }
  }

  const boardParsed = boardCards.map(parseCard).filter(Boolean);
  const boardHigh = Math.max(...boardParsed.map((card) => card.value));
  const overcards = holeCards.map(parseCard).filter(Boolean).filter((card) => card.value > boardHigh).length;

  if ((evaluation?.category || 0) < 1 && boardCards.length === 3 && outs < overcards * 3) {
    outs = overcards * 3;
    label = overcards === 2 ? 'Two overcards' : 'One overcard';
  }

  return {
    outs,
    label,
    flopToRiver: clamp(outs * 4, 0, 100),
    turnToRiver: clamp(outs * 2, 0, 100),
  };
};

export const categoryNameFromEvaluation = (evaluation) => evaluation?.categoryName || 'High Card';