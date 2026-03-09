import { HAND_CATEGORIES } from '../data/handEquities';
import { handLabelScore, parseRangeText } from '../data/gtoRanges';
import {
  cardsConflict,
  categoryNameFromEvaluation,
  compareHands,
  createDeck,
  estimateDrawOuts,
  evaluateSevenCardHand,
  handLabelToCombos,
  parseCard,
  pickRepresentativeCombo,
} from './handEvaluator';

const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));

const randomInt = (max) => Math.floor(Math.random() * max);

const sampleRunout = (deck, count) => {
  const workingDeck = [...deck];
  const cards = [];

  for (let index = 0; index < count; index += 1) {
    const nextIndex = randomInt(workingDeck.length);
    cards.push(workingDeck[nextIndex]);
    workingDeck.splice(nextIndex, 1);
  }

  return cards;
};

const normalizeExactCards = (cards = []) => Array.from(new Set(cards.map((card) => parseCard(card)?.code).filter(Boolean)));

const buildCategoryBreakdown = (heroCategories, villainCategories, completed) =>
  HAND_CATEGORIES.map((category) => ({
    category,
    hero: Number((((heroCategories[category] || 0) / completed) * 100).toFixed(1)),
    villain: Number((((villainCategories[category] || 0) / completed) * 100).toFixed(1)),
  }));

const computeRepresentativeStrength = (label, boardCards = []) => {
  const representative = pickRepresentativeCombo(label, boardCards);

  if (!representative) {
    return handLabelScore(label) / 100;
  }

  if (boardCards.length >= 3) {
    const evaluation = evaluateSevenCardHand([...representative, ...boardCards]);
    const draw = estimateDrawOuts(representative, boardCards);
    return clamp((evaluation?.category || 0) / 8 + (draw.outs ? draw.outs / 30 : 0.02) + handLabelScore(label) / 160, 0.05, 1.3);
  }

  return clamp(handLabelScore(label) / 100, 0.05, 1);
};

const expandRangeLabels = (labels, blockedCards = []) =>
  labels.flatMap((label) => handLabelToCombos(label, blockedCards).map((cards) => ({ label, cards })));

const averageTopSlice = (range, boardCards, topPercent = 0.15) => {
  const weightedHands = Object.entries(range)
    .map(([label, frequencies]) => ({
      label,
      weight: (frequencies.raise || 0) + (frequencies.call || 0),
      score: computeRepresentativeStrength(label, boardCards),
    }))
    .filter((item) => item.weight > 0.01)
    .sort((left, right) => right.score - left.score);

  const takeCount = Math.max(1, Math.round(weightedHands.length * topPercent));
  const slice = weightedHands.slice(0, takeCount);
  const totalWeight = slice.reduce((sum, item) => sum + item.weight, 0) || 1;

  return slice.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
};

export const potOdds = (callSize, potSize) => (Number(callSize) || 0) / ((Number(callSize) || 0) + (Number(potSize) || 0) || 1);

export const MDF = (betSize, potSize) => 1 - (Number(betSize) || 0) / ((Number(betSize) || 0) + (Number(potSize) || 0) || 1);

export const bluffRatio = (potOddsValue) => Number(potOddsValue) || 0;

export const ruleOfTwo = (outs) => Math.max(0, Math.min(100, Number(outs || 0) * 2));

export const ruleOfFour = (outs) => Math.max(0, Math.min(100, Number(outs || 0) * 4));

export const SPR = (effectiveStack, pot) => (Number(effectiveStack) || 0) / (Number(pot) || 1);

export const EVCall = (equity, potSize, callSize) => equity * ((Number(potSize) || 0) + (Number(callSize) || 0)) - (Number(callSize) || 0);

export const EVFold = () => 0;

export const EVBet = (foldEq, callEq, betSize, pot) => {
  const betAmount = Number(betSize) || 0;
  const potAmount = Number(pot) || 0;
  return foldEq * potAmount + (1 - foldEq) * (callEq * (potAmount + betAmount) - (1 - callEq) * betAmount);
};

export const confidenceInterval = (equity, iterations, zScore = 1.96) => {
  if (!iterations) {
    return { low: 0, high: 0, margin: 0 };
  }

  const proportion = equity / 100;
  const margin = zScore * Math.sqrt((proportion * (1 - proportion)) / iterations) * 100;
  return {
    low: Math.max(0, equity - margin),
    high: Math.min(100, equity + margin),
    margin,
  };
};

export const boardTextureLabel = (boardCards = []) => {
  if (boardCards.length < 3) {
    return 'Unpaired / Hidden';
  }

  const suits = boardCards.map((card) => card[1]);
  const ranks = boardCards.map((card) => card[0]);
  const suitedCount = Math.max(...['c', 'd', 'h', 's'].map((suit) => suits.filter((cardSuit) => cardSuit === suit).length));
  const paired = new Set(ranks).size !== ranks.length;
  const dynamic = boardCards.some((card, index) => {
    const value = '23456789TJQKA'.indexOf(card[0]);
    return boardCards.some((otherCard, otherIndex) => otherIndex > index && Math.abs(value - '23456789TJQKA'.indexOf(otherCard[0])) <= 2);
  });

  if (suitedCount === 3) {
    return 'Monotone';
  }

  if (paired) {
    return dynamic ? 'Paired Dynamic' : 'Paired Static';
  }

  return dynamic ? 'Connected / Dynamic' : 'Disconnected / Dry';
};

export const computeRangeAdvantage = (heroRange, villainRange, boardCards = []) => {
  const heroTop = averageTopSlice(heroRange, boardCards, 0.16);
  const villainTop = averageTopSlice(villainRange, boardCards, 0.16);
  const edge = heroTop - villainTop;

  return {
    heroScore: heroTop,
    villainScore: villainTop,
    edge,
    leader: edge >= 0 ? 'Hero' : 'Villain',
    nutAdvantagePct: Math.abs(edge) * 100,
    texture: boardTextureLabel(boardCards),
  };
};

export const polarizeRange = (range, boardCards = []) => {
  const entries = Object.entries(range)
    .map(([label, frequencies]) => ({
      label,
      weight: (frequencies.raise || 0) + (frequencies.call || 0),
      strength: computeRepresentativeStrength(label, boardCards),
    }))
    .filter((entry) => entry.weight > 0.01);

  return {
    valueHands: entries.filter((entry) => entry.strength >= 0.9).map((entry) => entry.label).slice(0, 10),
    bluffHands: entries.filter((entry) => entry.strength < 0.45 && entry.weight > 0.12).map((entry) => entry.label).slice(0, 10),
    checkingHands: entries.filter((entry) => entry.strength >= 0.45 && entry.strength < 0.75).map((entry) => entry.label).slice(0, 10),
  };
};

export const deriveSolverSnapshot = ({ range, villainRange, boardCards, betSizeOptions, potSize, street, heroPosition, villainPosition }) => {
  const activeHands = Object.entries(range).filter(([, frequencies]) => (frequencies.raise || 0) + (frequencies.call || 0) > 0.02);

  const rows = activeHands
    .map(([label, frequencies]) => {
      const baseWeight = (frequencies.raise || 0) + (frequencies.call || 0);
      const drawData = estimateDrawOuts(pickRepresentativeCombo(label, boardCards) || [], boardCards);
      const strength = computeRepresentativeStrength(label, boardCards);
      let betPct = clamp((strength - 0.28) * 0.9 + (frequencies.raise || 0) * 0.24 + (drawData.outs >= 8 ? 0.12 : 0), 0.04, 0.94);
      let raisePct = strength > 0.94 ? clamp(0.08 + (strength - 0.94) * 0.5, 0, 0.26) : 0;
      let foldPct = strength < 0.22 ? clamp(0.28 - strength, 0.08, 0.28) : 0;
      let checkPct = clamp(1 - betPct - raisePct - foldPct, 0.04, 0.88);
      const total = betPct + raisePct + foldPct + checkPct;
      betPct /= total;
      raisePct /= total;
      foldPct /= total;
      checkPct /= total;

      const sizingEVs = betSizeOptions.map((size) => {
        const betAmount = (potSize * size) / 100;
        const foldEq = clamp(0.12 + (1 - strength) * 0.24 + (size >= 100 ? 0.08 : 0), 0.06, 0.66);
        const callEq = clamp(strength + drawData.outs / 45 - size / 220, 0.04, 0.96);
        return {
          size,
          ev: EVBet(foldEq, callEq, betAmount, potSize),
        };
      });

      const bestSizing = sizingEVs.reduce((best, current) => (current.ev > best.ev ? current : best), sizingEVs[0] || { size: 0, ev: 0 });
      const checkEV = EVCall(clamp(strength * 0.72, 0.05, 0.95), potSize, 0) * 0.42;
      const foldEV = EVFold();

      return {
        label,
        weight: baseWeight,
        betPct,
        checkPct,
        raisePct,
        foldPct,
        bestSize: bestSizing.size,
        bestEV: bestSizing.ev,
        checkEV,
        foldEV,
        strength,
        mixText: `Bet ${Math.round(betPct * 100)}% / Check ${Math.round(checkPct * 100)}%`,
        sizingEVs,
      };
    })
    .sort((left, right) => right.bestEV - left.bestEV || right.strength - left.strength);

  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 1;
  const aggregate = rows.reduce(
    (accumulator, row) => ({
      bet: accumulator.bet + row.betPct * row.weight,
      check: accumulator.check + row.checkPct * row.weight,
      raise: accumulator.raise + row.raisePct * row.weight,
      fold: accumulator.fold + row.foldPct * row.weight,
    }),
    { bet: 0, check: 0, raise: 0, fold: 0 },
  );

  const aggregateFrequencies = {
    bet: aggregate.bet / totalWeight,
    check: aggregate.check / totalWeight,
    raise: aggregate.raise / totalWeight,
    fold: aggregate.fold / totalWeight,
  };

  const sizingSummary = betSizeOptions.map((size) => ({
    size,
    ev: rows.reduce((sum, row) => sum + (row.sizingEVs.find((entry) => entry.size === size)?.ev || 0) * row.weight, 0) / totalWeight,
  }));

  const recommendedSizing = sizingSummary.reduce((best, current) => (current.ev > best.ev ? current : best), sizingSummary[0] || { size: 33, ev: 0 });
  const rangeAdvantage = computeRangeAdvantage(range, villainRange, boardCards);
  const polarized = polarizeRange(range, boardCards);

  return {
    rows,
    aggregateFrequencies,
    recommendedSizing,
    sizingSummary,
    rangeAdvantage,
    polarized,
    nodeTree: {
      id: 'root',
      label: `${heroPosition} on ${street} (${boardCards.join(' ') || 'Preflop'})`,
      meta: `Texture: ${rangeAdvantage.texture}`,
      children: [
        {
          id: 'hero-decision',
          label: `Hero chooses ${recommendedSizing.size}% pot`,
          meta: `EV ${recommendedSizing.ev.toFixed(2)}bb`,
          children: [
            {
              id: 'villain-fold',
              label: `${villainPosition} folds`,
              meta: `Capture ${potSize.toFixed(1)}bb`,
            },
            {
              id: 'villain-call',
              label: `${villainPosition} calls`,
              meta: `Turn node opens`,
              children: [
                { id: 'turn-barrel', label: 'Polar hands barrel', meta: polarized.valueHands.slice(0, 3).join(', ') || 'Value continues' },
                { id: 'turn-check', label: 'Medium hands check back', meta: polarized.checkingHands.slice(0, 3).join(', ') || 'Marginal showdown' },
              ],
            },
          ],
        },
      ],
    },
  };
};

export const simulateRangeEquity = ({ heroInput, villainInput, boardCards = [], iterations = 10000 }) => {
  const heroLabels = Array.isArray(heroInput) ? heroInput : parseRangeText(heroInput);
  const villainLabels = Array.isArray(villainInput) ? villainInput : parseRangeText(villainInput);

  if (!heroLabels.length || !villainLabels.length) {
    return null;
  }

  const heroCombos = expandRangeLabels(heroLabels, boardCards);
  const villainCombos = expandRangeLabels(villainLabels, boardCards);

  if (!heroCombos.length || !villainCombos.length) {
    return null;
  }

  let heroWins = 0;
  let villainWins = 0;
  let ties = 0;
  let completed = 0;

  const heroCategories = HAND_CATEGORIES.reduce((accumulator, category) => ({ ...accumulator, [category]: 0 }), {});
  const villainCategories = HAND_CATEGORIES.reduce((accumulator, category) => ({ ...accumulator, [category]: 0 }), {});

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const heroCombo = heroCombos[randomInt(heroCombos.length)];
    let villainCombo = null;

    for (let attempt = 0; attempt < 14; attempt += 1) {
      const candidate = villainCombos[randomInt(villainCombos.length)];
      if (!cardsConflict(heroCombo.cards, candidate.cards)) {
        villainCombo = candidate;
        break;
      }
    }

    if (!villainCombo) {
      continue;
    }

    const usedCards = [...boardCards, ...heroCombo.cards, ...villainCombo.cards];
    const deck = createDeck(usedCards);
    const runout = sampleRunout(deck, Math.max(0, 5 - boardCards.length));
    const fullBoard = [...boardCards, ...runout];
    const heroEvaluation = evaluateSevenCardHand([...heroCombo.cards, ...fullBoard]);
    const villainEvaluation = evaluateSevenCardHand([...villainCombo.cards, ...fullBoard]);
    const result = compareHands(heroCombo.cards, villainCombo.cards, fullBoard);

    if (result > 0) {
      heroWins += 1;
      heroCategories[categoryNameFromEvaluation(heroEvaluation)] += 1;
    } else if (result < 0) {
      villainWins += 1;
      villainCategories[categoryNameFromEvaluation(villainEvaluation)] += 1;
    } else {
      ties += 1;
      heroCategories[categoryNameFromEvaluation(heroEvaluation)] += 0.5;
      villainCategories[categoryNameFromEvaluation(villainEvaluation)] += 0.5;
    }

    completed += 1;
  }

  if (!completed) {
    return null;
  }

  const heroEquity = ((heroWins + ties / 2) / completed) * 100;
  const villainEquity = 100 - heroEquity;
  const ci = confidenceInterval(heroEquity, completed);
  const categoryBreakdown = buildCategoryBreakdown(heroCategories, villainCategories, completed);

  return {
    heroEquity,
    villainEquity,
    iterations: completed,
    confidence: ci,
    categoryBreakdown,
  };
};

export const simulateHandVsHand = ({ heroLabel, villainLabel, heroCards = [], villainCards = [], boardCards = [], iterations = 10000 }) => {
  const normalizedBoard = normalizeExactCards(boardCards);
  const normalizedHeroCards = normalizeExactCards(heroCards);
  const normalizedVillainCards = normalizeExactCards(villainCards);

  if (normalizedHeroCards.length === 2 && normalizedVillainCards.length === 2) {
    const usedCards = [...normalizedBoard, ...normalizedHeroCards, ...normalizedVillainCards];

    if (new Set(usedCards).size !== usedCards.length) {
      return null;
    }

    let heroWins = 0;
    let villainWins = 0;
    let ties = 0;
    let completed = 0;

    const heroCategories = HAND_CATEGORIES.reduce((accumulator, category) => ({ ...accumulator, [category]: 0 }), {});
    const villainCategories = HAND_CATEGORIES.reduce((accumulator, category) => ({ ...accumulator, [category]: 0 }), {});

    for (let iteration = 0; iteration < iterations; iteration += 1) {
      const deck = createDeck(usedCards);
      const runout = sampleRunout(deck, Math.max(0, 5 - normalizedBoard.length));
      const fullBoard = [...normalizedBoard, ...runout];
      const heroEvaluation = evaluateSevenCardHand([...normalizedHeroCards, ...fullBoard]);
      const villainEvaluation = evaluateSevenCardHand([...normalizedVillainCards, ...fullBoard]);
      const winner = compareHands(normalizedHeroCards, normalizedVillainCards, fullBoard);

      if (!heroEvaluation || !villainEvaluation) {
        continue;
      }

      heroCategories[categoryNameFromEvaluation(heroEvaluation)] += 1;
      villainCategories[categoryNameFromEvaluation(villainEvaluation)] += 1;

      if (winner > 0) {
        heroWins += 1;
      } else if (winner < 0) {
        villainWins += 1;
      } else {
        ties += 1;
      }

      completed += 1;
    }

    if (!completed) {
      return null;
    }

    const heroEquity = ((heroWins + ties / 2) / completed) * 100;
    const drawData = estimateDrawOuts(normalizedHeroCards, normalizedBoard);

    return {
      heroEquity,
      villainEquity: 100 - heroEquity,
      iterations: completed,
      confidence: confidenceInterval(heroEquity, completed),
      categoryBreakdown: buildCategoryBreakdown(heroCategories, villainCategories, completed),
      outs: drawData.outs,
      drawLabel: drawData.label,
      flopToRiver: ruleOfFour(drawData.outs),
      turnToRiver: ruleOfTwo(drawData.outs),
    };
  }

  const result = simulateRangeEquity({ heroInput: [heroLabel], villainInput: [villainLabel], boardCards: normalizedBoard, iterations });
  if (!result) {
    return null;
  }

  const heroCombo = pickRepresentativeCombo(heroLabel, normalizedBoard) || [];
  const drawData = estimateDrawOuts(heroCombo, boardCards);

  return {
    ...result,
    outs: drawData.outs,
    drawLabel: drawData.label,
    flopToRiver: ruleOfFour(drawData.outs),
    turnToRiver: ruleOfTwo(drawData.outs),
  };
};