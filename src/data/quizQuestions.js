import { ALL_HANDS, POSITIONS, SCENARIOS, getDefaultRange, handLabelScore } from './gtoRanges';
import { estimateDrawOuts, pickRepresentativeCombo } from '../utils/handEvaluator';
import { MDF, SPR, bluffRatio, deriveSolverSnapshot, potOdds, ruleOfFour, ruleOfTwo } from '../utils/pokerMath';

const ACTION_LABELS = {
  raise: 'Raise',
  call: 'Call',
  fold: 'Fold',
};

const DIFFICULTY_ORDER = {
  Beginner: 0,
  Intermediate: 1,
  Advanced: 2,
};

const POSTFLOP_BET_OPTIONS = [33, 50, 75, 100];
const POSTFLOP_OPTIONS = ['Check', 'Bet 33%', 'Bet 50%', 'Bet 75%', 'Bet 100%', 'Mixed'];
const POSTFLOP_POSITION_MATCHUPS = [
  ['UTG', 'BB'],
  ['HJ', 'BB'],
  ['CO', 'BB'],
  ['BTN', 'BB'],
];
const POSTFLOP_BOARD_CASES = [
  { street: 'Flop', board: ['As', 'Kd', '4c'] },
  { street: 'Flop', board: ['Qh', 'Jd', '4d'] },
  { street: 'Flop', board: ['8s', '7s', '2c'] },
  { street: 'Flop', board: ['Tc', '8h', '4s'] },
  { street: 'Flop', board: ['Kh', '9h', '2d'] },
  { street: 'Flop', board: ['9s', '8s', '6d'] },
  { street: 'Flop', board: ['Ad', '7c', '2s'] },
  { street: 'Flop', board: ['Jc', 'Tc', '5d'] },
  { street: 'Flop', board: ['5s', '5d', '2c'] },
  { street: 'Flop', board: ['Qs', '7s', '3h'] },
  { street: 'Flop', board: ['Kc', 'Qd', 'Jh'] },
  { street: 'Flop', board: ['7d', '6c', '4d'] },
  { street: 'Flop', board: ['Ah', '8c', '5d'] },
  { street: 'Flop', board: ['Td', '7d', '3s'] },
];

const formatPercent = (value) => `${Number(value.toFixed(1))}%`;

const unique = (values) => Array.from(new Set(values.filter(Boolean)));

const normalizedPercentAnswers = (value) => {
  const rounded = Number(value.toFixed(1));
  const ratio = Number((value / 100).toFixed(3));
  return unique([
    `${rounded}`,
    `${rounded}%`,
    `${ratio}`,
    `${Number(ratio.toFixed(2))}`,
    Math.abs(rounded - Math.round(rounded)) <= 0.15 ? `${Math.round(rounded)}` : null,
    Math.abs(rounded - Math.round(rounded)) <= 0.15 ? `${Math.round(rounded)}%` : null,
  ]);
};

const formatActionFrequency = (profile) =>
  Object.entries(profile)
    .filter(([, frequency]) => frequency > 0.03)
    .sort((left, right) => right[1] - left[1])
    .map(([action, frequency]) => `${ACTION_LABELS[action]} ${Math.round(frequency * 100)}%`)
    .join(' / ');

const handDescriptor = (hand) => {
  const [firstRank, secondRank] = hand;
  const pair = firstRank === secondRank;
  const suited = hand.endsWith('s');
  const broadway = 'AKQJT'.includes(firstRank) && 'AKQJT'.includes(secondRank);
  const gap = Math.abs('AKQJT98765432'.indexOf(firstRank) - 'AKQJT98765432'.indexOf(secondRank));

  if (pair) {
    return handLabelScore(hand) >= 90 ? 'premium pocket pair' : 'pocket pair';
  }

  if (suited && gap === 1) {
    return 'suited connector';
  }

  if (suited && firstRank === 'A') {
    return 'suited ace';
  }

  if (broadway) {
    return suited ? 'suited broadway hand' : 'offsuit broadway hand';
  }

  return suited ? 'suited hand' : 'offsuit hand';
};

const preflopDecision = (profile) => {
  const ordered = Object.entries(profile).sort((left, right) => right[1] - left[1]);
  const [best, second] = ordered;

  if (!best) {
    return 'Fold';
  }

  if ((best[1] < 0.68 && second?.[1] > 0.16) || (best[1] - (second?.[1] || 0) < 0.18 && second?.[1] > 0.18)) {
    return 'Mixed';
  }

  return ACTION_LABELS[best[0]];
};

const preflopDifficulty = (scenario, profile, answer) => {
  const certainty = Math.max(profile.raise || 0, profile.call || 0, profile.fold || 0);

  if (answer === 'Mixed' || scenario === 'vs 4bet') {
    return 'Advanced';
  }

  if (scenario === 'RFI' && certainty >= 0.82) {
    return 'Beginner';
  }

  return 'Intermediate';
};

const buildPreflopQuestions = () => {
  let id = 1;

  return POSITIONS.flatMap((position) =>
    SCENARIOS.flatMap((scenario) => {
      const range = getDefaultRange(position, scenario);

      return ALL_HANDS.map((hand) => {
        const profile = range[hand] || { raise: 0, call: 0, fold: 1 };
        const answer = preflopDecision(profile);
        const frequencies = formatActionFrequency(profile) || 'Fold 100%';
        const descriptor = handDescriptor(hand);

        return {
          id: id += 1,
          hand,
          position,
          scenario,
          difficulty: preflopDifficulty(scenario, profile, answer),
          answer,
          options: ['Raise', 'Call', 'Fold', 'Mixed'],
          frequencies,
          explanation:
            answer === 'Mixed'
              ? `${hand} is a ${descriptor} that sits near indifference in the ${position} ${scenario} node. The equilibrium mix is ${frequencies}.`
              : `${hand} is a ${descriptor}. In the ${position} ${scenario} node, the equilibrium profile plays ${frequencies}, so ${answer.toLowerCase()} is the correct baseline action.`,
        };
      });
    }),
  );
};

const formatBetOption = (size) => `Bet ${size}%`;

const postflopAnswer = (row) => {
  const mixedNode = Math.abs(row.betPct - row.checkPct) <= 0.14 && row.betPct >= 0.25 && row.checkPct >= 0.25;

  if (mixedNode) {
    return 'Mixed';
  }

  if (row.checkPct >= row.betPct && row.checkPct >= 0.52) {
    return 'Check';
  }

  return formatBetOption(row.bestSize);
};

const postflopDifficulty = (answer, row, drawData) => {
  if (answer === 'Mixed' || drawData.outs >= 8 || row.strength < 0.32) {
    return 'Advanced';
  }

  if (row.strength >= 0.88 || row.checkPct >= 0.7 || row.betPct >= 0.7) {
    return 'Beginner';
  }

  return 'Intermediate';
};

const selectPostflopRows = (rows, boardCards) => {
  const enriched = rows
    .map((row) => {
      const combo = pickRepresentativeCombo(row.label, boardCards);
      if (!combo) {
        return null;
      }

      return {
        ...row,
        combo,
        drawData: estimateDrawOuts(combo, boardCards),
      };
    })
    .filter(Boolean);

  const picks = [];
  const used = new Set();
  const claim = (predicate) => {
    const next = enriched.find((candidate) => !used.has(candidate.label) && predicate(candidate));
    if (next) {
      used.add(next.label);
      picks.push(next);
    }
  };

  claim((candidate) => candidate.strength >= 0.92);
  claim((candidate) => candidate.drawData.outs >= 8 && candidate.strength < 0.9);
  claim((candidate) => candidate.checkPct >= candidate.betPct && candidate.strength >= 0.45 && candidate.strength <= 0.82);
  claim((candidate) => candidate.strength <= 0.28);

  enriched.forEach((candidate) => {
    if (picks.length < 4 && !used.has(candidate.label)) {
      used.add(candidate.label);
      picks.push(candidate);
    }
  });

  return picks.slice(0, 4);
};

const buildPostflopQuestions = () => {
  let id = 10000;
  const potSizes = [8, 10, 12, 14, 16, 18];
  const sprTargets = [2.5, 3.5, 5, 6.5, 8];

  return POSTFLOP_BOARD_CASES.flatMap((boardCase, boardIndex) =>
    POSTFLOP_POSITION_MATCHUPS.flatMap(([heroPosition, villainPosition], positionIndex) => {
      const pot = potSizes[(boardIndex + positionIndex) % potSizes.length];
      const spr = sprTargets[(boardIndex * 2 + positionIndex) % sprTargets.length];
      const heroRange = getDefaultRange(heroPosition, 'RFI');
      const villainRange = getDefaultRange(villainPosition, villainPosition === 'BB' ? 'vs 3bet' : 'RFI');
      const snapshot = deriveSolverSnapshot({
        range: heroRange,
        villainRange,
        boardCards: boardCase.board,
        betSizeOptions: POSTFLOP_BET_OPTIONS,
        potSize: pot,
        street: boardCase.street,
        heroPosition,
        villainPosition,
      });

      return selectPostflopRows(snapshot.rows, boardCase.board).map((row) => {
        const answer = postflopAnswer(row);
        const bestSizeLabel = formatBetOption(row.bestSize);
        const texture = snapshot.rangeAdvantage.texture;

        return {
          id: id += 1,
          heroHand: row.combo,
          board: boardCase.board,
          position: heroPosition,
          villainPosition,
          street: boardCase.street,
          pot,
          spr,
          prompt: 'What is the preferred GTO line for hero here?',
          title: `${row.combo.join(' ')} on ${boardCase.board.join(' ')}`,
          subtitle: `${heroPosition} vs ${villainPosition} • ${boardCase.street} • Pot ${pot}bb • SPR ${spr.toFixed(1)} • ${texture}`,
          options: POSTFLOP_OPTIONS,
          answer,
          difficulty: postflopDifficulty(answer, row, row.drawData),
          explanation:
            answer === 'Mixed'
              ? `${row.label} sits in a mixed region on this ${texture.toLowerCase()} board. The row strategy is ${row.mixText}, with ${bestSizeLabel} as the best betting branch.`
              : `${row.label} prefers ${answer.toLowerCase()} on this ${texture.toLowerCase()} board. The solver row mixes ${row.mixText} and selects ${bestSizeLabel} when betting has the highest EV.`,
        };
      });
    }),
  );
};

const mathDifficulty = (value, advanced = false) => {
  if (advanced || !Number.isInteger(value)) {
    return 'Advanced';
  }

  if (value % 5 === 0) {
    return 'Beginner';
  }

  return 'Intermediate';
};

const buildPotOddsQuestions = () => {
  let id = 20000;
  const pots = [12, 15, 18, 20, 24, 30, 36, 40, 45, 50, 60, 75];
  const bets = [4, 5, 6, 8, 10, 12, 15, 18, 20, 24, 30, 40];

  return pots.flatMap((pot) =>
    bets
      .filter((bet) => bet < pot * 1.6)
      .map((bet) => {
        const requiredEquity = potOdds(bet, pot) * 100;
        const advanced = bet > pot || Math.abs(requiredEquity - Math.round(requiredEquity)) > 0.05;

        return {
          id: id += 1,
          type: 'input',
          difficulty: mathDifficulty(Number(requiredEquity.toFixed(1)), advanced),
          prompt: `Pot: ${pot}bb. Villain bets ${bet}bb. What equity do you need to call?`,
          answer: `${Number(requiredEquity.toFixed(1))}`,
          acceptable: normalizedPercentAnswers(requiredEquity),
          explanation: `You call ${bet} to win ${pot + bet} total, so ${bet} / ${pot + bet} = ${formatPercent(requiredEquity)} required equity.`,
        };
      }),
  );
};

const buildMdfQuestions = () => {
  let id = 30000;
  const pots = [10, 12, 15, 18, 20, 24, 30, 40, 50, 60];
  const bets = [3, 4, 5, 6, 8, 10, 12, 15, 18, 20, 24, 30];

  return pots.flatMap((pot) =>
    bets
      .filter((bet) => bet <= pot * 1.5)
      .map((bet) => {
        const value = MDF(bet, pot) * 100;
        const advanced = bet > pot || Math.abs(value - Math.round(value)) > 0.05;

        return {
          id: id += 1,
          type: 'input',
          difficulty: mathDifficulty(Number(value.toFixed(1)), advanced),
          prompt: `Pot: ${pot}bb. Villain bets ${bet}bb. What minimum defense frequency stops auto-profit?`,
          answer: `${Number(value.toFixed(1))}`,
          acceptable: normalizedPercentAnswers(value),
          explanation: `MDF = 1 - ${bet} / (${pot} + ${bet}) = ${formatPercent(value)}. That is the defense floor before exploitation.`,
        };
      }),
  );
};

const buildOutsQuestions = () => {
  let id = 40000;
  const outsValues = [4, 5, 6, 7, 8, 9, 12, 15];

  return outsValues.flatMap((outs) => {
    const flopEquity = ruleOfFour(outs);
    const turnEquity = ruleOfTwo(outs);

    return [
      {
        id: id += 1,
        type: 'input',
        difficulty: mathDifficulty(flopEquity, outs >= 12),
        prompt: `You have ${outs} outs on the flop. Approximate equity by the river using the Rule of 4?`,
        answer: `${flopEquity}`,
        acceptable: normalizedPercentAnswers(flopEquity),
        explanation: `Rule of 4 gives ${outs} x 4 = ${flopEquity}%, which is the standard flop approximation.`,
      },
      {
        id: id += 1,
        type: 'input',
        difficulty: mathDifficulty(turnEquity, outs >= 12),
        prompt: `You have ${outs} outs on the turn. Approximate river equity using the Rule of 2?`,
        answer: `${turnEquity}`,
        acceptable: normalizedPercentAnswers(turnEquity),
        explanation: `Rule of 2 gives ${outs} x 2 = ${turnEquity}%, which is the standard turn approximation.`,
      },
    ];
  });
};

const buildSprQuestions = () => {
  let id = 50000;
  const stacks = [25, 30, 40, 50, 60, 75, 80, 90, 100, 120];
  const pots = [10, 12, 15, 18, 20, 24, 30, 40];

  return stacks.flatMap((stack) =>
    pots.map((pot) => {
      const value = SPR(stack, pot);
      return {
        id: id += 1,
        type: 'input',
        difficulty: mathDifficulty(Number(value.toFixed(1)), !Number.isInteger(value)),
        prompt: `Effective stack ${stack}bb into a ${pot}bb pot. What is the SPR?`,
        answer: `${Number(value.toFixed(1))}`,
        acceptable: unique([`${Number(value.toFixed(1))}`, Number.isInteger(value) ? `${value}` : null]),
        explanation: `SPR is effective stack divided by pot, so ${stack} / ${pot} = ${Number(value.toFixed(1))}.`,
      };
    }),
  );
};

const buildBluffRatioQuestions = () => {
  let id = 60000;
  const pots = [12, 15, 20, 24, 30, 40, 50, 60];
  const bets = [4, 6, 8, 10, 12, 15, 20, 30, 40];

  return pots.flatMap((pot) =>
    bets
      .filter((bet) => bet <= pot * 1.5)
      .map((bet) => {
        const value = bluffRatio(potOdds(bet, pot)) * 100;
        return {
          id: id += 1,
          type: 'input',
          difficulty: mathDifficulty(Number(value.toFixed(1)), bet > pot),
          prompt: `Pot: ${pot}bb. If you bet ${bet}bb, what bluff ratio does this simplified trainer use?`,
          answer: `${Number(value.toFixed(1))}`,
          acceptable: normalizedPercentAnswers(value),
          explanation: `This trainer uses bluff ratio equal to pot odds. ${bet} / (${pot} + ${bet}) = ${formatPercent(value)}.`,
        };
      }),
  );
};

export const preflopQuestions = buildPreflopQuestions();
export const postflopQuestions = buildPostflopQuestions();
export const mathQuestions = [
  ...buildPotOddsQuestions(),
  ...buildMdfQuestions(),
  ...buildOutsQuestions(),
  ...buildSprQuestions(),
  ...buildBluffRatioQuestions(),
];

export const quizQuestionCounts = {
  preflop: preflopQuestions.length,
  postflop: postflopQuestions.length,
  math: mathQuestions.length,
};

export const QUIZ_TOPICS = [
  { key: 'preflop', label: 'Preflop Ranges' },
  { key: 'postflop', label: 'Postflop Decisions' },
  { key: 'math', label: 'Pot Odds & Math' },
];