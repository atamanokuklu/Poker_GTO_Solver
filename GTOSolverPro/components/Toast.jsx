import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import Animated, { SlideInDown, SlideOutUp } from 'react-native-reanimated';
import { useAppContext } from '@/context/AppContext';
import { colors, fonts, radius, spacing } from '@/constants/theme';

const toneMap = {
  success: { icon: 'check-circle', color: colors.success },
  error: { icon: 'alert-triangle', color: colors.danger },
  info: { icon: 'info', color: colors.accent },
};

const Toast = () => {
  const insets = useSafeAreaInsets();
  const { toasts, removeToast } = useAppContext();

  return (
    <View pointerEvents="box-none" style={[styles.container, { top: insets.top + 10 }]}> 
      {toasts.map((toast) => {
        const tone = toneMap[toast.tone] || toneMap.info;

        return (
          <Animated.View key={toast.id} entering={SlideInDown.springify().damping(16)} exiting={SlideOutUp.duration(180)} style={styles.toast}>
            <View style={styles.toastBody}>
              <Feather color={tone.color} name={tone.icon} size={18} />
              <Text style={styles.message}>{toast.message}</Text>
            </View>
            <Pressable hitSlop={10} onPress={() => removeToast(toast.id)} style={styles.closeButton}>
              <Feather color={colors.muted} name="x" size={16} />
            </Pressable>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: spacing.md,
    right: spacing.md,
    zIndex: 999,
    gap: spacing.sm,
  },
  toast: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.lg,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
  },
  toastBody: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  message: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    padding: 2,
  },
});

export default Toast;