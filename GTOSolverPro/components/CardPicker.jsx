import { Pressable, StyleSheet, Text, View } from 'react-native';
import CardSelect from '@/components/CardSelect';
import SectionCard from '@/components/SectionCard';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { normalizeCardCode } from '@/utils/cards';

const CardPicker = ({ title, selectedCards = [], maxCards = 5, onChangeCards }) => {
  const slots = Array.from({ length: maxCards }, (_, index) => selectedCards[index] || '');

  return (
    <SectionCard>
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>Pick up to {maxCards} unique cards for the board.</Text>
        </View>
        <Pressable onPress={() => onChangeCards([])} style={styles.clearButton}>
          <Text style={styles.clearButtonLabel}>Clear Board</Text>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {slots.map((card, index) => (
          <View key={`slot-${index}`} style={styles.slot}>
            <Text style={styles.slotLabel}>Card {index + 1}</Text>
            <CardSelect
              value={card}
              placeholder={`Board card ${index + 1}`}
              excludedCards={slots.filter((_, slotIndex) => slotIndex !== index)}
              onChange={(nextCard) => {
                const nextCards = [...slots];
                nextCards[index] = normalizeCardCode(nextCard);
                onChangeCards(nextCards.filter(Boolean));
              }}
            />
          </View>
        ))}
      </View>
    </SectionCard>
  );
};

const styles = StyleSheet.create({
  headerRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  headerCopy: {
    flex: 1,
  },
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
  clearButton: {
    backgroundColor: 'rgba(201, 168, 76, 0.12)',
    borderColor: 'rgba(201, 168, 76, 0.24)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs + 2,
  },
  clearButtonLabel: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  grid: {
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  slot: {
    gap: spacing.xs,
  },
  slotLabel: {
    color: colors.muted,
    fontSize: 12,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});

export default CardPicker;