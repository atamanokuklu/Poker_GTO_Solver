import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { HAND_MATRIX } from '@/data/gtoRanges';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const describeProfile = (profile = {}) => {
  const actions = [
    { label: 'Raise', value: Math.round((profile.raise || 0) * 100) },
    { label: 'Call', value: Math.round((profile.call || 0) * 100) },
    { label: 'Fold', value: Math.round((profile.fold || 0) * 100) },
  ].filter((entry) => entry.value > 0);

  return actions.length ? actions.map((entry) => `${entry.label} ${entry.value}%`).join(' / ') : 'Fold 100%';
};

const cellTone = (profile = {}) => {
  const raise = profile.raise || 0;
  const call = profile.call || 0;

  if (raise > 0.58 && call < 0.2) {
    return { backgroundColor: 'rgba(201, 168, 76, 0.24)', borderColor: 'rgba(201, 168, 76, 0.32)' };
  }

  if (call > 0.44 && raise < 0.3) {
    return { backgroundColor: 'rgba(46, 204, 113, 0.2)', borderColor: 'rgba(46, 204, 113, 0.28)' };
  }

  if (raise + call > 0.15) {
    return { backgroundColor: 'rgba(24, 43, 30, 1)', borderColor: 'rgba(201, 168, 76, 0.18)' };
  }

  return { backgroundColor: colors.card, borderColor: colors.border };
};

const HandGrid = ({ title, subtitle, rangeData = {}, selectedHands = [], compact = false, onCellPress, onCellClick }) => {
  const [focusedHand, setFocusedHand] = useState(null);
  const { width } = useWindowDimensions();
  const isNarrow = width < 380;
  const selected = useMemo(() => new Set(selectedHands), [selectedHands]);
  const cellSize = Math.max(24, Math.floor(width / (isNarrow ? 15 : 14)));
  const handleCellPress = onCellPress || onCellClick;

  const renderRow = ({ item: row, index }) => (
    <View style={styles.row}>
      {row.map((handLabel) => {
        const profile = rangeData[handLabel] || { raise: 0, call: 0, fold: 1 };
        const tone = cellTone(profile);
        const isSelected = selected.has(handLabel);

        return (
          <Pressable
            key={handLabel}
            onLongPress={() => setFocusedHand({ handLabel, profile })}
            onPress={() => {
              if (handleCellPress) {
                handleCellPress(handLabel, profile);
                return;
              }

              setFocusedHand({ handLabel, profile });
            }}
            style={[
              styles.cell,
              tone,
              {
                width: cellSize,
                height: cellSize,
              },
              isSelected ? styles.cellSelected : null,
            ]}
          >
            <Text style={[styles.cellLabel, compact || isNarrow ? styles.cellLabelCompact : null]}>{handLabel}</Text>
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <SectionCard>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {handleCellPress ? <Text style={styles.hint}>Tap to edit. Long press for exact frequencies.</Text> : null}

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.gridScrollContent}>
        <FlatList
          data={HAND_MATRIX}
          keyExtractor={(_, index) => `row-${index}`}
          renderItem={renderRow}
          horizontal={false}
          scrollEnabled={false}
          initialNumToRender={10}
          getItemLayout={(_, index) => ({ length: cellSize + spacing.xs, offset: (cellSize + spacing.xs) * index, index })}
        />
      </ScrollView>

      <Modal animationType="fade" transparent visible={Boolean(focusedHand)} onRequestClose={() => setFocusedHand(null)}>
        <View style={styles.modalScrim}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{focusedHand?.handLabel}</Text>
            <Text style={styles.modalBody}>{describeProfile(focusedHand?.profile)}</Text>
            <Pressable onPress={() => setFocusedHand(null)} style={styles.modalButton}>
              <Text style={styles.modalButtonLabel}>Close</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  title: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 24,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  hint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: spacing.sm,
  },
  gridScrollContent: {
    paddingTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    marginBottom: spacing.xs,
  },
  cell: {
    alignItems: 'center',
    borderRadius: radius.md,
    borderWidth: 1,
    justifyContent: 'center',
    marginRight: spacing.xs,
  },
  cellSelected: {
    borderColor: colors.accent,
    borderWidth: 2,
  },
  cellLabel: {
    color: colors.text,
    fontFamily: fonts.mono,
    fontSize: 11,
  },
  cellLabelCompact: {
    fontSize: 9,
  },
  modalScrim: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.lg,
    width: '100%',
  },
  modalTitle: {
    color: colors.accent,
    fontFamily: fonts.heading,
    fontSize: 28,
  },
  modalBody: {
    color: colors.text,
    fontSize: 15,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  modalButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.32)',
    borderRadius: radius.lg,
    borderWidth: 1,
    marginTop: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  modalButtonLabel: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default HandGrid;