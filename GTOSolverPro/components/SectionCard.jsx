import { StyleSheet, View } from 'react-native';
import { colors, radius, shadows, spacing } from '@/constants/theme';

const SectionCard = ({ children, style }) => <View style={[styles.card, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: spacing.md,
    ...shadows.card,
  },
});

export default SectionCard;