import { useEffect, useMemo, useState } from 'react';
import { Alert, BackHandler, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import ScreenContainer from '@/components/ScreenContainer';
import SectionCard from '@/components/SectionCard';
import QuizCard from '@/components/QuizCard';
import HandGrid from '@/components/HandGrid';
import { useAppContext } from '@/context/AppContext';
import { getDefaultRange } from '@/data/gtoRanges';
import { mathQuestions, postflopQuestions, preflopQuestions } from '@/data/quizQuestions';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const questionPools = {
  preflop: preflopQuestions,
  postflop: postflopQuestions,
  math: mathQuestions,
};

const difficultyRank = { Beginner: 0, Intermediate: 1, Advanced: 2 };

const normalizeAnswer = (answer) => String(answer || '').trim().toLowerCase();

const matchesDifficulty = (questionDifficulty, selectedDifficulty) => difficultyRank[questionDifficulty] <= difficultyRank[selectedDifficulty];

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

const QuizSessionScreen = ({ mode }) => {
  const router = useRouter();
  const { hydrated, quizSession, startQuizMode, advanceQuizQuestion, resetQuizSession, recordQuizAnswer, userStats, pushToast } = useAppContext();
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [freeTextAnswer, setFreeTextAnswer] = useState('');
  const [revealed, setRevealed] = useState(false);
  const [timeLeft, setTimeLeft] = useState(quizSession.timer);
  const [answerOutcome, setAnswerOutcome] = useState(null);

  useEffect(() => {
    if (quizSession.mode !== mode) {
      startQuizMode(mode);
    }
  }, [mode, quizSession.mode, startQuizMode]);

  useEffect(() => {
    const onBackPress = () => {
      if (quizSession.total === 0 && !revealed) {
        return false;
      }

      Alert.alert('Exit quiz?', 'Current progress is already saved locally. Leave this session?', [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => router.back(),
        },
      ]);

      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => subscription.remove();
  }, [quizSession.total, revealed, router]);

  const activeQuestions = useMemo(() => {
    const questions = questionPools[mode] || [];
    const filtered = questions.filter((question) => matchesDifficulty(question.difficulty || 'Beginner', quizSession.difficulty));
    return shuffleQuestions(filtered, `${quizSession.sessionSeed}-${mode}-${quizSession.difficulty}`);
  }, [mode, quizSession.difficulty, quizSession.sessionSeed]);

  const currentQuestion = activeQuestions.length ? activeQuestions[quizSession.currentQuestionIndex % activeQuestions.length] : null;
  const sessionComplete = quizSession.sessionLength !== 'Infinite' && quizSession.total >= Number(quizSession.sessionLength || 0);
  const currentPreflopRange = useMemo(() => {
    if (mode !== 'preflop' || !currentQuestion) {
      return null;
    }

    return getDefaultRange(currentQuestion.position, currentQuestion.scenario);
  }, [currentQuestion, mode]);

  useEffect(() => {
    setTimeLeft(quizSession.timer);
  }, [currentQuestion, quizSession.timer]);

  useEffect(() => {
    if (revealed || !quizSession.timer || sessionComplete || !currentQuestion) {
      return undefined;
    }

    const timerId = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          clearInterval(timerId);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [currentQuestion, quizSession.timer, revealed, sessionComplete]);

  useEffect(() => {
    if (timeLeft === 0 && !revealed && currentQuestion) {
      handleSubmit('');
    }
  }, [currentQuestion, revealed, timeLeft]);

  const handleSubmit = async (submittedAnswer) => {
    if (!currentQuestion || revealed) {
      return;
    }

    const rawAnswer = mode === 'math' ? normalizeAnswer(submittedAnswer || freeTextAnswer) : normalizeAnswer(submittedAnswer || selectedAnswer);
    const correct =
      mode === 'math'
        ? currentQuestion.acceptable.some((value) => normalizeAnswer(value) === rawAnswer)
        : normalizeAnswer(currentQuestion.answer) === rawAnswer;

    recordQuizAnswer({
      mode,
      correct,
      weaknessKey:
        currentQuestion.weaknessKey ||
        (mode === 'preflop'
          ? `${currentQuestion.position} ${currentQuestion.hand}`
          : mode === 'postflop'
            ? `${currentQuestion.position} vs ${currentQuestion.villainPosition} ${currentQuestion.board.join(' ')}`
            : currentQuestion.prompt),
    });

    setAnswerOutcome({ correct, provided: rawAnswer });
    setRevealed(true);

    if (correct) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      pushToast('Correct. +40 XP.', 'success');
    } else {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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

  if (!hydrated) {
    return (
      <ScreenContainer>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>Loading quiz state...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (!currentQuestion) {
    return (
      <ScreenContainer>
        <View style={styles.loadingState}>
          <Text style={styles.loadingText}>No questions available for this mode and difficulty.</Text>
        </View>
      </ScreenContainer>
    );
  }

  const frontContent = mode === 'math' ? (
    <KeyboardAvoidingView behavior={Platform.OS === 'android' ? 'height' : 'padding'}>
      <View style={styles.questionStack}>
        <Text style={styles.prompt}>{currentQuestion.prompt}</Text>
        <TextInput
          autoCapitalize="none"
          keyboardType="numeric"
          onChangeText={setFreeTextAnswer}
          placeholder="Enter answer"
          placeholderTextColor={colors.muted}
          style={styles.input}
          value={freeTextAnswer}
        />
        <Pressable onPress={() => handleSubmit(freeTextAnswer)} style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}>
          <Text style={styles.primaryButtonLabel}>Submit Answer</Text>
        </Pressable>
        <SectionCard style={styles.noteCard}>
          <Text style={styles.noteTitle}>Rule of 2 / Rule of 4 reference</Text>
          <Text style={styles.noteText}>Rule of 2: outs × 2 on the turn. Rule of 4: outs × 4 on the flop. Use implied odds when the immediate price is close but future action adds value.</Text>
        </SectionCard>
      </View>
    </KeyboardAvoidingView>
  ) : (
    <View style={styles.questionStack}>
      {mode === 'postflop' ? <SectionCard style={styles.promptCard}><Text style={styles.noteText}>{currentQuestion.prompt}</Text></SectionCard> : null}
      {mode === 'preflop' ? <SectionCard style={styles.promptCard}><Text style={styles.noteText}>Equilibrium frequencies: {currentQuestion.frequencies}</Text></SectionCard> : null}
      <View style={styles.answerGrid}>
        {(currentQuestion.options || ['Raise', 'Call', 'Fold', 'Mixed']).map((option) => (
          <Pressable
            key={option}
            onPress={() => {
              setSelectedAnswer(option);
              handleSubmit(option);
            }}
            style={({ pressed }) => [styles.answerButton, selectedAnswer === option ? styles.answerButtonSelected : null, pressed ? styles.buttonPressed : null]}
          >
            <Text style={[styles.answerButtonLabel, selectedAnswer === option ? styles.answerButtonLabelSelected : null]}>{option}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );

  const backContent = (
    <View style={styles.questionStack}>
      <View style={[styles.resultCard, answerOutcome?.correct ? styles.resultCardSuccess : styles.resultCardError]}>
        <Text style={[styles.resultEyebrow, answerOutcome?.correct ? styles.resultTextSuccess : styles.resultTextError]}>
          {answerOutcome?.correct ? 'Correct' : 'Incorrect'}
        </Text>
        <Text style={[styles.resultText, answerOutcome?.correct ? styles.resultTextSuccess : styles.resultTextError]}>
          {answerOutcome?.correct ? 'You chose the best answer.' : `Correct answer: ${currentQuestion.answer}.`}
        </Text>
        {answerOutcome?.provided ? <Text style={styles.resultMeta}>Your answer: {answerOutcome.provided}</Text> : null}
        <Text style={[styles.resultText, styles.resultExplanation]}>{currentQuestion.explanation}</Text>
        {!answerOutcome?.correct && mode !== 'math' ? <Text style={styles.resultMeta}>Review why the preferred line beats the alternatives before moving on.</Text> : null}
      </View>

      {mode === 'preflop' && !answerOutcome?.correct ? (
        <HandGrid compact title="Range location" subtitle={`${currentQuestion.position} • ${currentQuestion.scenario}`} rangeData={currentPreflopRange || {}} selectedHands={[currentQuestion.hand]} />
      ) : null}

      <Pressable onPress={goToNext} style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null]}>
        <Text style={styles.primaryButtonLabel}>Next Question</Text>
      </Pressable>
    </View>
  );

  return (
    <ScreenContainer scrollable>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.backButton, pressed ? styles.buttonPressed : null]}>
          <Feather color={colors.text} name="arrow-left" size={16} />
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>
        <Text style={styles.eyebrow}>{mode.toUpperCase()} Session</Text>
        <Text style={styles.title}>{questionTitle(mode, currentQuestion)}</Text>
        <Text style={styles.subtitle}>{questionSubtitle(mode, currentQuestion)}</Text>
      </View>

      <View style={styles.scoreGrid}>
        <SectionCard style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Score</Text>
          <Text style={styles.scoreValue}>{quizSession.score} / {quizSession.total}</Text>
        </SectionCard>
        <SectionCard style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Streak</Text>
          <Text style={[styles.scoreValue, styles.dangerValue]}>{quizSession.streak}</Text>
        </SectionCard>
        <SectionCard style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>Timer</Text>
          <Text style={[styles.scoreValue, styles.successValue]}>{quizSession.timer ? timeLeft : 'Off'}</Text>
        </SectionCard>
      </View>

      {sessionComplete ? (
        <SectionCard>
          <Text style={styles.completeTitle}>Session complete</Text>
          <Text style={styles.completeBody}>You finished {quizSession.total} questions with {(quizSession.total ? (quizSession.score / quizSession.total) * 100 : 0).toFixed(1)}% accuracy.</Text>
          <Pressable onPress={resetQuizSession} style={({ pressed }) => [styles.primaryButton, pressed ? styles.buttonPressed : null, styles.completeButton]}>
            <Text style={styles.primaryButtonLabel}>Start New Session</Text>
          </Pressable>
        </SectionCard>
      ) : (
        <QuizCard
          backContent={backContent}
          frontContent={frontContent}
          revealed={revealed}
          statusLabel={revealed ? (answerOutcome?.correct ? 'Correct Answer' : 'Review Spot') : undefined}
          subtitle={questionSubtitle(mode, currentQuestion)}
          title={questionTitle(mode, currentQuestion)}
        />
      )}

      <SectionCard>
        <Text style={styles.sessionMeta}>Question bank: {activeQuestions.length} filtered spots ready in this lane. Practice volume so far: {userStats.totalHandsReviewed} hands reviewed.</Text>
      </SectionCard>
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  loadingState: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    color: colors.text,
    fontSize: 16,
  },
  header: {
    paddingTop: spacing.sm,
  },
  backButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButtonLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  eyebrow: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  title: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 34,
    marginTop: spacing.xs,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  scoreGrid: {
    gap: spacing.sm,
  },
  scoreCard: {
    gap: spacing.xs,
  },
  scoreLabel: {
    color: colors.muted,
    fontSize: 11,
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },
  scoreValue: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 32,
  },
  dangerValue: {
    color: colors.danger,
  },
  successValue: {
    color: colors.success,
  },
  questionStack: {
    gap: spacing.md,
  },
  prompt: {
    color: colors.text,
    fontSize: 16,
    lineHeight: 24,
  },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 16,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  noteCard: {
    backgroundColor: colors.card,
  },
  noteTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  noteText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  promptCard: {
    backgroundColor: colors.card,
  },
  answerGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  answerButton: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    minWidth: '47%',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  answerButtonSelected: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.35)',
  },
  answerButtonLabel: {
    color: colors.text,
    fontSize: 15,
    textAlign: 'center',
  },
  answerButtonLabelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.35)',
    borderRadius: radius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  primaryButtonLabel: {
    color: colors.accent,
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  resultCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
  },
  resultEyebrow: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  resultCardSuccess: {
    backgroundColor: 'rgba(46, 204, 113, 0.12)',
    borderColor: 'rgba(46, 204, 113, 0.32)',
  },
  resultCardError: {
    backgroundColor: 'rgba(231, 76, 60, 0.12)',
    borderColor: 'rgba(231, 76, 60, 0.32)',
  },
  resultText: {
    fontSize: 15,
    lineHeight: 22,
  },
  resultExplanation: {
    marginTop: spacing.sm,
  },
  resultMeta: {
    color: colors.muted,
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 18,
    marginTop: spacing.sm,
  },
  resultTextSuccess: {
    color: colors.success,
  },
  resultTextError: {
    color: '#ffb4aa',
  },
  completeTitle: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 30,
  },
  completeBody: {
    color: colors.muted,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  completeButton: {
    marginTop: spacing.md,
  },
  sessionMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});

export default QuizSessionScreen;