import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { colors, fonts, radius, spacing } from '@/constants/theme';
import { CARD_OPTIONS, SUIT_META, normalizeCardCode } from '@/utils/cards';

const cardLabel = (card) => {
  const normalized = normalizeCardCode(card);

  if (!normalized) {
    return null;
  }

  const suit = SUIT_META[normalized[1]];
  return `${normalized[0]}${suit.icon} ${suit.label}`;
};

const CardSelect = ({ value, onChange, placeholder = 'Select a card', excludedCards = [] }) => {
  const normalizedValue = normalizeCardCode(value);
  const blocked = new Set(excludedCards.map(normalizeCardCode).filter(Boolean));

  return (
    <View style={styles.wrapper}>
      <View style={styles.headerRow}>
        <Text style={styles.valueLabel}>{cardLabel(normalizedValue) || placeholder}</Text>
        {normalizedValue ? (
          <Pressable onPress={() => onChange('')} style={styles.clearButton}>
            <Text style={styles.clearButtonLabel}>Clear</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.pickerShell}>
        <Picker
          dropdownIconColor={colors.accent}
          selectedValue={normalizedValue || ''}
          style={styles.picker}
          onValueChange={(nextValue) => onChange(nextValue)}
        >
          <Picker.Item color={colors.muted} label={placeholder} value="" />
          {CARD_OPTIONS.filter((option) => !blocked.has(option.value) || option.value === normalizedValue).map((option) => (
            <Picker.Item key={option.value} color={colors.text} label={option.label} value={option.value} />
          ))}
        </Picker>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.sm,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  valueLabel: {
    color: colors.text,
    flex: 1,
    fontFamily: fonts.mono,
    fontSize: 13,
  },
  clearButton: {
    backgroundColor: 'rgba(231, 76, 60, 0.14)',
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  clearButtonLabel: {
    color: colors.danger,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  pickerShell: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  picker: {
    color: colors.text,
  },
});

export default CardSelect;