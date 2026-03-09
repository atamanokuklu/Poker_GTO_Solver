import { SPR, potOdds } from './pokerMath';

const STREET_KEYS = ['preflop', 'flop', 'turn', 'river'];

const normalizeAmount = (value) => {
  const parsed = Number(String(value || '').replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const extractBracketCards = (line) => Array.from(line.matchAll(/\[([^\]]+)\]/g)).map((match) => match[1].trim().split(/\s+/)).flat();

const positionLabelsForPlayerCount = (count) => {
  const templates = {
    2: ['SB', 'BB'],
    3: ['BTN', 'SB', 'BB'],
    4: ['BTN', 'SB', 'BB', 'CO'],
    5: ['BTN', 'SB', 'BB', 'UTG', 'CO'],
    6: ['BTN', 'SB', 'BB', 'UTG', 'HJ', 'CO'],
    7: ['BTN', 'SB', 'BB', 'UTG', 'MP', 'HJ', 'CO'],
    8: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'HJ', 'CO'],
    9: ['BTN', 'SB', 'BB', 'UTG', 'UTG+1', 'MP', 'LJ', 'HJ', 'CO'],
  };

  return templates[Math.min(9, Math.max(2, count))] || templates[6];
};

const assignPositions = (players, buttonSeat) => {
  if (!players.length) {
    return players;
  }

  const labels = positionLabelsForPlayerCount(players.length);
  const ordered = [...players].sort((left, right) => left.seat - right.seat);
  const buttonIndex = ordered.findIndex((player) => player.seat === buttonSeat);
  const rotated = buttonIndex >= 0 ? [...ordered.slice(buttonIndex), ...ordered.slice(0, buttonIndex)] : ordered;

  return rotated.map((player, index) => ({
    ...player,
    position: labels[index] || `Seat ${player.seat}`,
  }));
};

export const parseHandHistory = (text) => {
  const lines = (text || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentStreet = 'preflop';
  let currentPot = 0;
  let buttonSeat = null;

  const parsed = {
    site: /ggpoker/i.test(text || '') ? 'GGPoker' : /pokerstars/i.test(text || '') ? 'PokerStars' : 'Unknown',
    handId: null,
    players: [],
    hero: null,
    heroHand: [],
    board: { flop: [], turn: null, river: null },
    actions: { preflop: [], flop: [], turn: [], river: [] },
    showdown: [],
    winners: [],
    timeline: [],
  };

  lines.forEach((line) => {
    if (/Hand #/i.test(line)) {
      parsed.handId = line;
      return;
    }

    const buttonMatch = line.match(/Seat #(\d+) is the button/i);
    if (buttonMatch) {
      buttonSeat = Number(buttonMatch[1]);
      return;
    }

    const seatMatch = line.match(/^Seat\s+(\d+):\s+(.+?)\s+\(([^)]+)\)/i);
    if (seatMatch) {
      parsed.players.push({
        seat: Number(seatMatch[1]),
        name: seatMatch[2],
        stack: normalizeAmount(seatMatch[3]),
      });
      return;
    }

    const dealtMatch = line.match(/^Dealt to\s+(.+?)\s+\[([^\]]+)\]/i);
    if (dealtMatch) {
      parsed.hero = dealtMatch[1];
      parsed.heroHand = dealtMatch[2].split(/\s+/);
      return;
    }

    if (/\*\*\* HOLE CARDS \*\*\*/i.test(line)) {
      currentStreet = 'preflop';
      return;
    }

    if (/\*\*\* FLOP \*\*\*/i.test(line)) {
      currentStreet = 'flop';
      parsed.board.flop = extractBracketCards(line).slice(0, 3);
      return;
    }

    if (/\*\*\* TURN \*\*\*/i.test(line)) {
      currentStreet = 'turn';
      parsed.board.turn = extractBracketCards(line).slice(-1)[0] || null;
      return;
    }

    if (/\*\*\* RIVER \*\*\*/i.test(line)) {
      currentStreet = 'river';
      parsed.board.river = extractBracketCards(line).slice(-1)[0] || null;
      return;
    }

    if (/\*\*\* SHOW DOWN \*\*\*/i.test(line)) {
      currentStreet = 'river';
      return;
    }

    const postBlindMatch = line.match(/^(.+?):\s+posts\s+(small blind|big blind|ante)\s+(.+)$/i);
    if (postBlindMatch) {
      const amount = normalizeAmount(postBlindMatch[3]);
      currentPot += amount;
      parsed.actions.preflop.push({ actor: postBlindMatch[1], action: `posts ${postBlindMatch[2]}`, amount, potAfter: currentPot, raw: line });
      parsed.timeline.push({ street: 'preflop', actor: postBlindMatch[1], action: `posts ${postBlindMatch[2]}`, amount, potAfter: currentPot, spr: 0, raw: line });
      return;
    }

    const actionMatch = line.match(/^(.+?):\s(checks|folds|calls|bets|raises|shows|mucks|collected)(.*)$/i);
    if (actionMatch) {
      const actor = actionMatch[1];
      const action = actionMatch[2].toLowerCase();
      const tail = actionMatch[3].trim();
      const amount = normalizeAmount(action === 'raises' && /to/i.test(tail) ? tail.split(/to/i).slice(-1)[0] : tail);

      if (['calls', 'bets', 'raises'].includes(action)) {
        currentPot += amount;
      }

      if (action === 'collected') {
        parsed.winners.push({ actor, amount, raw: line });
      }

      const event = { actor, action, amount, potAfter: currentPot, raw: line };

      if (action === 'shows' || action === 'mucks') {
        parsed.showdown.push(event);
      } else if (STREET_KEYS.includes(currentStreet)) {
        parsed.actions[currentStreet].push(event);
      }

      parsed.timeline.push({
        street: currentStreet,
        actor,
        action,
        amount,
        potAfter: currentPot,
        spr: parsed.players.length ? SPR(Math.max(...parsed.players.map((player) => player.stack)), Math.max(currentPot, 1)) : 0,
        raw: line,
      });
    }
  });

  parsed.players = assignPositions(parsed.players, buttonSeat);
  parsed.boardCards = [...parsed.board.flop, parsed.board.turn, parsed.board.river].filter(Boolean);

  const heroActions = parsed.timeline.filter((entry) => entry.actor === parsed.hero);
  const deviationCandidates = heroActions.map((entry) => {
    const facingBet = entry.amount > 0 && ['calls', 'raises', 'folds'].includes(entry.action);
    const requiredEquity = facingBet ? potOdds(entry.amount, Math.max(entry.potAfter - entry.amount, 0.01)) * 100 : 0;
    return {
      ...entry,
      requiredEquity,
    };
  });

  parsed.summary = {
    totalPlayers: parsed.players.length,
    finalPot: currentPot,
    heroActions: heroActions.length,
    deviationCandidates,
  };

  return parsed;
};