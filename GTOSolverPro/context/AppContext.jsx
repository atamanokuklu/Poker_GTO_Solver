import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { XP_LEVELS } from '@/data/handEquities';
import { load, save } from '@/utils/storage';

const AppContext = createContext(null);

const STORAGE_KEY = 'gto-solver-pro-state';

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

const defaultRangeState = {
  position: 'CO',
  scenario: 'RFI',
  tightness: 68,
  overrides: {},
};

const defaultBoardState = {
  solverBoard: ['', '', '', '', ''],
  equityBoard: [],
};

const resolveLevel = (xp) => XP_LEVELS.filter((level) => xp >= level.xp).slice(-1)[0] || XP_LEVELS[0];

const mergeQuizSession = (persisted) => {
  const defaults = createQuizDefaults();

  if (!persisted) {
    return defaults;
  }

  return {
    ...defaults,
    ...persisted,
    topics: {
      ...defaults.topics,
      ...(persisted.topics || {}),
    },
  };
};

export const AppProvider = ({ children }) => {
  const [rangeState, setRangeState] = useState(defaultRangeState);
  const [boardState, setBoardState] = useState(defaultBoardState);
  const [quizSession, setQuizSession] = useState(createQuizDefaults);
  const [userStats, setUserStats] = useState(defaultUserStats);
  const [toasts, setToasts] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const levelInfo = resolveLevel(userStats.xp);

  const applyPersistedState = useCallback((persisted) => {
    setRangeState(persisted?.rangeState || defaultRangeState);
    setBoardState(persisted?.boardState || defaultBoardState);
    setQuizSession(mergeQuizSession(persisted?.quizSession));
    setUserStats(persisted?.userStats || defaultUserStats);
  }, []);

  const reloadPersistedState = useCallback(async () => {
    const persisted = await load(STORAGE_KEY, null);

    if (persisted) {
      applyPersistedState(persisted);
    }
  }, [applyPersistedState]);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      const persisted = await load(STORAGE_KEY, null);

      if (!active) {
        return;
      }

      if (persisted) {
        applyPersistedState(persisted);
      }

      setHydrated(true);
    };

    hydrate();

    return () => {
      active = false;
    };
  }, [applyPersistedState]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    save(STORAGE_KEY, {
      rangeState,
      boardState,
      quizSession,
      userStats,
    }).catch(() => undefined);
  }, [boardState, hydrated, quizSession, rangeState, userStats]);

  const pushToast = useCallback((message, tone = 'info') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((current) => [...current, { id, message, tone }]);

    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 2500);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const updateRangeState = useCallback((patch) => {
    setRangeState((current) => ({ ...current, ...patch }));
  }, []);

  const setRangeOverride = useCallback((rangeKey, handLabel, profile) => {
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
  }, []);

  const replaceRangeOverrides = useCallback((rangeKey, nextRange) => {
    setRangeState((current) => ({
      ...current,
      overrides: {
        ...current.overrides,
        [rangeKey]: nextRange,
      },
    }));
  }, []);

  const resetRangeOverrides = useCallback((rangeKey) => {
    setRangeState((current) => {
      const nextOverrides = { ...current.overrides };
      delete nextOverrides[rangeKey];

      return {
        ...current,
        overrides: nextOverrides,
      };
    });
  }, []);

  const updateBoardState = useCallback((key, value) => {
    setBoardState((current) => ({ ...current, [key]: value }));
  }, []);

  const updateQuizSession = useCallback((patch) => {
    setQuizSession((current) => ({ ...current, ...patch }));
  }, []);

  const startQuizMode = useCallback((mode) => {
    setQuizSession((current) => ({
      ...current,
      mode,
      score: 0,
      total: 0,
      streak: 0,
      currentQuestionIndex: 0,
      sessionSeed: Date.now(),
    }));
  }, []);

  const advanceQuizQuestion = useCallback(() => {
    setQuizSession((current) => ({ ...current, currentQuestionIndex: current.currentQuestionIndex + 1 }));
  }, []);

  const resetQuizSession = useCallback(() => {
    setQuizSession((current) => ({
      ...current,
      score: 0,
      total: 0,
      streak: 0,
      currentQuestionIndex: 0,
      sessionSeed: Date.now(),
    }));
  }, []);

  const recordQuizAnswer = useCallback(({ mode, correct, weaknessKey }) => {
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
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      rangeState,
      updateRangeState,
      setRangeOverride,
      replaceRangeOverrides,
      resetRangeOverrides,
      boardState,
      updateBoardState,
      quizSession,
      updateQuizSession,
      startQuizMode,
      advanceQuizQuestion,
      resetQuizSession,
      recordQuizAnswer,
      userStats,
      levelInfo,
      toasts,
      pushToast,
      removeToast,
      reloadPersistedState,
    }),
    [
      advanceQuizQuestion,
      boardState,
      hydrated,
      levelInfo,
      pushToast,
      quizSession,
      rangeState,
      replaceRangeOverrides,
      recordQuizAnswer,
      reloadPersistedState,
      removeToast,
      resetQuizSession,
      resetRangeOverrides,
      setRangeOverride,
      startQuizMode,
      toasts,
      updateBoardState,
      updateQuizSession,
      updateRangeState,
      userStats,
    ],
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