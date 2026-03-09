import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { XP_LEVELS } from '../data/handEquities';

const AppContext = createContext(null);

const STORAGE_KEY = 'gto-solver-pro-state';

const MODULES = [
  { id: 'range-builder', label: 'Range Builder' },
  { id: 'gto-solver', label: 'GTO Solver' },
  { id: 'equity-calculator', label: 'Equity Calculator' },
  { id: 'hand-history', label: 'Hand History Analyzer' },
  { id: 'quiz-module', label: 'Quiz Module' },
];

const createQuizDefaults = () => ({
  mode: 'preflop',
  difficulty: 'Intermediate',
  topics: {
    preflop: true,
    postflop: true,
    math: true,
  },
  timer: 20,
  sessionLength: 10,
  score: 0,
  total: 0,
  streak: 0,
  currentQuestionIndex: 0,
  sessionSeed: Date.now(),
});

const defaultUserStats = {
  accuracyByCategory: {
    preflop: { correct: 0, total: 0 },
    postflop: { correct: 0, total: 0 },
    math: { correct: 0, total: 0 },
  },
  weakestSpots: {},
  totalHandsReviewed: 0,
  xp: 0,
  practiceCalendar: {},
};

const loadPersistedState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const resolveLevel = (xp) => XP_LEVELS.filter((level) => xp >= level.xp).slice(-1)[0] || XP_LEVELS[0];

export const AppProvider = ({ children }) => {
  const persisted = typeof window !== 'undefined' ? loadPersistedState() : null;
  const defaultQuizSession = createQuizDefaults();
  const [activeModule, setActiveModule] = useState('range-builder');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rangeState, setRangeState] = useState(
    persisted?.rangeState || {
      position: 'CO',
      scenario: 'RFI',
      tightness: 68,
      overrides: {},
    },
  );
  const [boardState, setBoardState] = useState(
    persisted?.boardState || {
      solverBoard: ['', '', '', '', ''],
      equityBoard: [],
    },
  );
  const [quizSession, setQuizSession] = useState(
    persisted?.quizSession
      ? {
          ...defaultQuizSession,
          ...persisted.quizSession,
          topics: {
            ...defaultQuizSession.topics,
            ...(persisted.quizSession.topics || {}),
          },
        }
      : defaultQuizSession,
  );
  const [userStats, setUserStats] = useState(persisted?.userStats || defaultUserStats);
  const [toasts, setToasts] = useState([]);
  const levelInfo = resolveLevel(userStats.xp);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        rangeState,
        boardState,
        quizSession,
        userStats,
      }),
    );
  }, [boardState, quizSession, rangeState, userStats]);

  const pushToast = (message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2800);
  };

  const removeToast = (id) => setToasts((current) => current.filter((toast) => toast.id !== id));

  const updateRangeState = (patch) => setRangeState((current) => ({ ...current, ...patch }));

  const setRangeOverride = (rangeKey, handLabel, profile) => {
    setRangeState((current) => ({
      ...current,
      overrides: {
        ...current.overrides,
        [rangeKey]: {
          ...(current.overrides[rangeKey] || {}),
          [handLabel]: profile,
        },
      },
    }));
  };

  const replaceRangeOverrides = (rangeKey, overrides) => {
    setRangeState((current) => ({
      ...current,
      overrides: {
        ...current.overrides,
        [rangeKey]: overrides,
      },
    }));
  };

  const resetRangeOverrides = (rangeKey) => {
    setRangeState((current) => {
      const nextOverrides = { ...current.overrides };
      delete nextOverrides[rangeKey];
      return {
        ...current,
        overrides: nextOverrides,
      };
    });
  };

  const updateBoardState = (key, value) => setBoardState((current) => ({ ...current, [key]: value }));

  const updateQuizSession = (patch) => setQuizSession((current) => ({ ...current, ...patch }));

  const advanceQuizQuestion = () => setQuizSession((current) => ({ ...current, currentQuestionIndex: current.currentQuestionIndex + 1 }));

  const resetQuizSession = () =>
    setQuizSession((current) => ({
      ...current,
      score: 0,
      total: 0,
      streak: 0,
      currentQuestionIndex: 0,
      sessionSeed: Date.now(),
    }));

  const recordQuizAnswer = ({ mode, correct, weaknessKey }) => {
    setQuizSession((current) => ({
      ...current,
      score: current.score + (correct ? 1 : 0),
      total: current.total + 1,
      streak: correct ? current.streak + 1 : 0,
    }));

    setUserStats((current) => {
      const categoryStats = current.accuracyByCategory[mode] || { correct: 0, total: 0 };
      const nextXp = current.xp + (correct ? 40 : 8);
      const dateKey = new Date().toISOString().slice(0, 10);

      return {
        ...current,
        accuracyByCategory: {
          ...current.accuracyByCategory,
          [mode]: {
            correct: categoryStats.correct + (correct ? 1 : 0),
            total: categoryStats.total + 1,
          },
        },
        weakestSpots: correct
          ? current.weakestSpots
          : {
              ...current.weakestSpots,
              [weaknessKey]: (current.weakestSpots[weaknessKey] || 0) + 1,
            },
        totalHandsReviewed: current.totalHandsReviewed + 1,
        xp: nextXp,
        practiceCalendar: {
          ...current.practiceCalendar,
          [dateKey]: (current.practiceCalendar[dateKey] || 0) + 1,
        },
      };
    });
  };

  const value = useMemo(
    () => ({
      modules: MODULES,
      activeModule,
      setActiveModule,
      sidebarOpen,
      setSidebarOpen,
      rangeState,
      updateRangeState,
      setRangeOverride,
      replaceRangeOverrides,
      resetRangeOverrides,
      boardState,
      updateBoardState,
      quizSession,
      updateQuizSession,
      advanceQuizQuestion,
      resetQuizSession,
      recordQuizAnswer,
      userStats,
      levelInfo,
      toasts,
      pushToast,
      removeToast,
    }),
    [activeModule, boardState, levelInfo, quizSession, rangeState, sidebarOpen, toasts, userStats],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error('useAppContext must be used within AppProvider');
  }

  return context;
};