import { useEffect, useMemo, useState } from 'react';
import { Flame, TimerReset } from 'lucide-react';
import HandGrid from '../components/HandGrid';
import QuizCard from '../components/QuizCard';
import StatsPanel from '../components/StatsPanel';
import { useAppContext } from '../context/AppContext';
import { getDefaultRange } from '../data/gtoRanges';
import { mathQuestions, postflopQuestions, preflopQuestions, quizQuestionCounts, QUIZ_TOPICS } from '../data/quizQuestions';

const questionPools = {
  preflop: preflopQuestions,
  postflop: postflopQuestions,
  math: mathQuestions,
};

const normalizeAnswer = (answer) => String(answer || '').trim().toLowerCase();

const topicKeyFromMode = (mode) => (mode === 'postflop' ? 'postflop' : mode === 'math' ? 'math' : 'preflop');
const difficultyRank = { Beginner: 0, Intermediate: 1, Advanced: 2 };

const createSeededRandom = (seed) => {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
};

const stringToSeed = (value) =>
  String(value || '')
    .split('')
    .reduce((seed, character) => (seed * 31 + character.charCodeAt(0)) >>> 0, 2166136261);

const shuffleQuestions = (questions, seedKey) => {
  const randomized = [...questions];
  const random = createSeededRandom(stringToSeed(seedKey));

  for (let index = randomized.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [randomized[index], randomized[swapIndex]] = [randomized[swapIndex], randomized[index]];
  }

  return randomized;
};

const matchesDifficulty = (questionDifficulty, selectedDifficulty) => difficultyRank[questionDifficulty] <= difficultyRank[selectedDifficulty];

const questionTitle = (mode, question) => {
  if (mode === 'preflop') {
    return `${question.hand} from ${question.position}`;
  }

  if (mode === 'postflop') {
    return question.title || `${question.heroHand.join(' ')} on ${question.board.join(' ')}`;
  }

  return 'Math Drill';
};

const questionSubtitle = (mode, question) => {
  if (mode === 'preflop') {
    return `Scenario: ${question.scenario} • ${question.frequencies}`;
  }

  if (mode === 'postflop') {
    return question.subtitle || `${question.position} vs ${question.villainPosition} • Pot ${question.pot}bb • SPR ${question.spr}`;
  }

  return question.prompt;
};

const QuizModule = () => {
  const {
    quizSession,
    updateQuizSession,
    advanceQuizQuestion,
    resetQuizSession,
    recordQuizAnswer,
    userStats,
    levelInfo,
    pushToast,
  } = useAppContext();
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [freeTextAnswer, setFreeTextAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quizSession.timer);
  const [answerOutcome, setAnswerOutcome] = useState(null);

  const currentMode = quizSession.mode;
  const currentTopicEnabled = quizSession.topics[topicKeyFromMode(currentMode)];
  const activeQuestions = useMemo(() => {
    const questions = questionPools[currentMode] || [];
    const filtered = questions.filter((question) => matchesDifficulty(question.difficulty || 'Beginner', quizSession.difficulty));
    return shuffleQuestions(filtered, `${quizSession.sessionSeed}-${currentMode}-${quizSession.difficulty}`);
  }, [currentMode, quizSession.difficulty, quizSession.sessionSeed]);

  const currentQuestion = activeQuestions.length ? activeQuestions[quizSession.currentQuestionIndex % activeQuestions.length] : null;
  const sessionComplete = quizSession.sessionLength !== 'Infinite' && quizSession.total >= Number(quizSession.sessionLength || 0);
  const currentPreflopRange = useMemo(() => {
    if (currentMode !== 'preflop' || !currentQuestion) {
      return null;
    }

    return getDefaultRange(currentQuestion.position, currentQuestion.scenario);
  }, [currentMode, currentQuestion]);

  useEffect(() => {
    setTimeLeft(quizSession.timer);
  }, [currentQuestion, quizSession.timer]);

  useEffect(() => {
    if (revealed || !quizSession.timer || sessionComplete || !currentQuestion) {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          window.clearInterval(timerId);
          return 0;
        }
        return current - 1;
      });
    }, 1000);

    return () => window.clearInterval(timerId);
  }, [currentQuestion, quizSession.timer, revealed, sessionComplete]);

  useEffect(() => {
    if (timeLeft === 0 && !revealed && currentQuestion) {
      handleSubmit('');
    }
  }, [timeLeft]);

  const handleSubmit = (submittedAnswer) => {
    if (!currentQuestion || revealed) {
      return;
    }

    const rawAnswer = currentMode === 'math' ? normalizeAnswer(submittedAnswer || freeTextAnswer) : normalizeAnswer(submittedAnswer || selectedAnswer);
    const correct =
      currentMode === 'math'
        ? currentQuestion.acceptable.some((value) => normalizeAnswer(value) === rawAnswer)
        : normalizeAnswer(currentQuestion.answer) === rawAnswer;

    recordQuizAnswer({
      mode: currentMode,
      correct,
      weaknessKey:
        currentQuestion.weaknessKey ||
        (currentMode === 'preflop'
          ? `${currentQuestion.position} ${currentQuestion.hand}`
          : currentMode === 'postflop'
            ? `${currentQuestion.position} vs ${currentQuestion.villainPosition} ${currentQuestion.board.join(' ')}`
            : currentQuestion.prompt),
    });

    setAnswerOutcome({ correct, provided: rawAnswer });
    setRevealed(true);
    if (correct) {
      pushToast(`Correct. +40 XP.`, 'success');
    } else {
      pushToast('Spot marked incorrect. Review the explanation.', 'info');
    }
  };

  const goToNext = () => {
    advanceQuizQuestion();
    setSelectedAnswer('');
    setFreeTextAnswer('');
    setRevealed(false);
    setAnswerOutcome(null);
  };

  if (!currentTopicEnabled) {
    return (
      <div className="module-shell glass-panel rounded-[28px] p-6">
        <h2 className="font-display text-4xl text-gold">Quiz topic disabled</h2>
        <p className="mt-3 text-sm text-muted">Enable the selected topic in quiz settings to continue.</p>
      </div>
    );
  }

  return (
    <div className="module-shell space-y-6">
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <section className="space-y-6">
          <div className="glass-panel rounded-[28px] p-5">
            <p className="text-xs uppercase tracking-[0.32em] text-muted">Quiz Module</p>
            <h2 className="mt-2 font-display text-4xl text-gold">Practice lane</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Three fully interactive quiz modes with score tracking, timing, streaks, and persistent study stats.</p>

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Mode</label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {[
                    { id: 'preflop', label: 'Preflop Ranges' },
                    { id: 'postflop', label: 'Postflop Decisions' },
                    { id: 'math', label: 'Pot Odds & Math' },
                  ].map((modeOption) => (
                    <button
                      key={modeOption.id}
                      type="button"
                      onClick={() => {
                        updateQuizSession({ mode: modeOption.id, currentQuestionIndex: 0, sessionSeed: Date.now() });
                        setSelectedAnswer('');
                        setFreeTextAnswer('');
                        setRevealed(false);
                      }}
                      className={`pressable rounded-2xl border px-3 py-3 text-sm ${quizSession.mode === modeOption.id ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-muted'}`}
                    >
                      {modeOption.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Difficulty</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Beginner', 'Intermediate', 'Advanced'].map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => {
                        updateQuizSession({ difficulty, currentQuestionIndex: 0, sessionSeed: Date.now() });
                        setSelectedAnswer('');
                        setFreeTextAnswer('');
                        setRevealed(false);
                      }}
                      className={`pressable rounded-2xl border px-3 py-3 text-sm ${quizSession.difficulty === difficulty ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-muted'}`}
                    >
                      {difficulty}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Topics filter</label>
                <div className="space-y-2">
                  {QUIZ_TOPICS.map((topic) => (
                    <label key={topic.key} className="flex items-center gap-3 rounded-2xl border border-white/5 bg-surface/70 px-3 py-3 text-sm text-ink">
                      <input
                        type="checkbox"
                        checked={quizSession.topics[topic.key]}
                        onChange={(event) => updateQuizSession({ topics: { ...quizSession.topics, [topic.key]: event.target.checked } })}
                        className="accent-[#c9a84c]"
                      />
                      {topic.label}
                    </label>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Timer mode</label>
                  <select value={quizSession.timer} onChange={(event) => updateQuizSession({ timer: Number(event.target.value) })} className="w-full rounded-2xl border border-white/5 bg-surface px-3 py-3 text-sm text-ink outline-none">
                    <option value={10}>10s</option>
                    <option value={20}>20s</option>
                    <option value={30}>30s</option>
                    <option value={0}>Off</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-xs uppercase tracking-[0.25em] text-muted">Session length</label>
                  <select value={quizSession.sessionLength} onChange={(event) => updateQuizSession({ sessionLength: event.target.value === 'Infinite' ? 'Infinite' : Number(event.target.value) })} className="w-full rounded-2xl border border-white/5 bg-surface px-3 py-3 text-sm text-ink outline-none">
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                    <option value="Infinite">Infinite</option>
                  </select>
                </div>
              </div>

              <button type="button" onClick={resetQuizSession} className="pressable flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-surface px-4 py-3 text-sm text-ink">
                <TimerReset className="h-4 w-4" /> Reset Session
              </button>

              <div className="rounded-2xl border border-gold/12 bg-surface/60 px-4 py-3 text-sm text-muted">
                Question bank: {quizQuestionCounts[currentMode]} total spots in this mode, shuffled fresh each session.
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="glass-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Score</p>
              <p className="mt-2 font-display text-4xl text-gold">{quizSession.score} / {quizSession.total}</p>
            </div>
            <div className="glass-panel rounded-3xl p-4">
              <p className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted"><Flame className="h-4 w-4 text-danger" /> Streak</p>
              <p className="mt-2 font-display text-4xl text-danger">{quizSession.streak}</p>
            </div>
            <div className="glass-panel rounded-3xl p-4">
              <p className="text-xs uppercase tracking-[0.25em] text-muted">Timer</p>
              <p className="mt-2 font-display text-4xl text-success">{quizSession.timer ? timeLeft : 'Off'}</p>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          {sessionComplete ? (
            <div className="glass-panel rounded-[28px] p-6">
              <h3 className="font-display text-3xl text-gold">Session complete</h3>
              <p className="mt-3 text-sm text-muted">You finished {quizSession.total} questions with {(quizSession.total ? (quizSession.score / quizSession.total) * 100 : 0).toFixed(1)}% accuracy.</p>
              <button type="button" onClick={resetQuizSession} className="pressable mt-5 rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold">
                Start New Session
              </button>
            </div>
          ) : currentQuestion ? (
            <QuizCard
              title={questionTitle(currentMode, currentQuestion)}
              subtitle={questionSubtitle(currentMode, currentQuestion)}
              revealed={revealed}
              footer={
                revealed ? (
                  <div className="space-y-4">
                    <div className={`rounded-2xl border px-4 py-4 text-sm ${answerOutcome?.correct ? 'border-success/30 bg-success/10 text-success' : 'border-danger/30 bg-danger/10 text-danger'}`}>
                      {answerOutcome?.correct ? 'Correct.' : `Correct answer: ${currentQuestion.answer}.`} {currentQuestion.explanation}
                    </div>
                    {currentMode === 'preflop' && !answerOutcome?.correct ? (
                      <HandGrid
                        compact
                        title="Range location"
                        subtitle={`${currentQuestion.position} • ${currentQuestion.scenario}`}
                        rangeData={currentPreflopRange || {}}
                        selectedHands={[currentQuestion.hand]}
                      />
                    ) : null}
                    <button type="button" onClick={goToNext} className="pressable rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold">
                      Next Question
                    </button>
                  </div>
                ) : null
              }
            >
              {currentMode === 'math' ? (
                <div className="space-y-4">
                  <p className="text-sm leading-7 text-ink">{currentQuestion.prompt}</p>
                  <input value={freeTextAnswer} onChange={(event) => setFreeTextAnswer(event.target.value)} placeholder="Enter answer" className="w-full rounded-2xl border border-white/5 bg-felt px-4 py-3 text-sm text-ink outline-none" />
                  <button type="button" onClick={() => handleSubmit(freeTextAnswer)} className="pressable rounded-2xl border border-gold/25 bg-gold/10 px-4 py-3 text-sm text-gold">
                    Submit Answer
                  </button>
                  <details className="rounded-2xl border border-white/5 bg-surface/70 px-4 py-3 text-sm text-muted">
                    <summary className="cursor-pointer text-gold">Rule of 2 / Rule of 4 reference</summary>
                    <p className="mt-3">Rule of 2: outs × 2 on the turn. Rule of 4: outs × 4 on the flop. Use implied odds when the immediate price is close but future action adds value.</p>
                  </details>
                </div>
              ) : (
                <div className="space-y-4">
                  {currentMode === 'postflop' ? (
                    <div className="rounded-2xl border border-white/5 bg-surface/70 px-4 py-4 text-sm text-muted">
                      {currentQuestion.prompt}
                    </div>
                  ) : null}
                  {currentMode === 'preflop' ? (
                    <div className="rounded-2xl border border-white/5 bg-surface/70 px-4 py-4 text-sm text-muted">
                      Equilibrium frequencies: {currentQuestion.frequencies}
                    </div>
                  ) : null}
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {(currentQuestion.options || ['Raise', 'Call', 'Fold', 'Mixed']).map((option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() => {
                          setSelectedAnswer(option);
                          handleSubmit(option);
                        }}
                        className={`pressable rounded-2xl border px-4 py-4 text-sm ${selectedAnswer === option ? 'border-gold/40 bg-gold/10 text-gold' : 'border-white/5 bg-surface text-ink'}`}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </QuizCard>
          ) : null}

          <StatsPanel userStats={userStats} levelInfo={levelInfo} />
        </section>
      </div>
    </div>
  );
};

export default QuizModule;