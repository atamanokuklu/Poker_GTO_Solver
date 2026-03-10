import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ScreenContainer from '@/components/ScreenContainer';
import StatsPanel from '@/components/StatsPanel';
import { useAppContext } from '@/context/AppContext';
import { colors, fonts, spacing } from '@/constants/theme';

const QuizStatsScreen = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { userStats, levelInfo, reloadPersistedState } = useAppContext();

  const handleRefresh = async () => {
    setRefreshing(true);
    await reloadPersistedState();
    setRefreshing(false);
  };

  return (
    <ScreenContainer
      scrollable
      refreshControl={{
        refreshing,
        onRefresh: handleRefresh,
      }}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>Quiz Module</Text>
        <Text style={styles.title}>Stats Dashboard</Text>
        <Text style={styles.subtitle}>Pull down to reload persisted stats from AsyncStorage and confirm mobile persistence is working.</Text>
      </View>

      <StatsPanel levelInfo={levelInfo} userStats={userStats} />
    </ScreenContainer>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: spacing.sm,
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
});

export default QuizStatsScreen;