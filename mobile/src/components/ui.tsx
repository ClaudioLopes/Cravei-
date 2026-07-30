import React from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewProps,
} from 'react-native';
import { colors } from '../theme/colors';

export function Screen({ children, scroll = true }: { children: React.ReactNode; scroll?: boolean }) {
  const content = (
    <View style={styles.screenInner}>{children}</View>
  );
  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {scroll ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>{content}</ScrollView>
      ) : (
        content
      )}
    </KeyboardAvoidingView>
  );
}

export function Card({ children, style, ...rest }: ViewProps) {
  return (
    <View style={[styles.card, style]} {...rest}>
      {children}
    </View>
  );
}

export function Title({ children }: { children: React.ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Subtitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.subtitle}>{children}</Text>;
}

export function Field({
  label,
  ...rest
}: TextInputProps & { label: string }) {
  return (
    <View style={styles.fieldWrapper}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        placeholderTextColor={colors.textMuted}
        style={styles.input}
        {...rest}
      />
    </View>
  );
}

export const Button = React.forwardRef<
  React.ElementRef<typeof Pressable>,
  {
    label: string;
    onPress: () => void;
    loading?: boolean;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }
>(function Button({ label, onPress, loading, variant = 'primary', disabled }, ref) {
  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'danger' && styles.buttonDanger,
        (disabled || loading) && styles.buttonDisabled,
        pressed && styles.buttonPressed,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.background} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            variant === 'secondary' && styles.buttonLabelSecondary,
          ]}
        >
          {label}
        </Text>
      )}
    </Pressable>
  );
});

export function ErrorText({ children }: { children?: string | null }) {
  if (!children) return null;
  return <Text style={styles.errorText}>{children}</Text>;
}

export function EmptyState({ message }: { message: string }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  scrollContent: { flexGrow: 1, padding: 20 },
  screenInner: { flex: 1, gap: 16 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8,
  },
  title: { color: colors.text, fontSize: 26, fontFamily: 'Oswald_700Bold', textTransform: 'uppercase' },
  subtitle: { color: colors.textMuted, fontSize: 15 },
  fieldWrapper: { gap: 6 },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontFamily: 'WorkSans_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.text,
    fontSize: 16,
    fontFamily: 'WorkSans_400Regular',
  },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.accent,
  },
  buttonDanger: { backgroundColor: colors.danger },
  buttonDisabled: { opacity: 0.5 },
  buttonPressed: { opacity: 0.8 },
  buttonLabel: {
    color: colors.background,
    fontSize: 15,
    fontFamily: 'Oswald_700Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  buttonLabelSecondary: { color: colors.accent },
  errorText: { color: colors.danger, fontSize: 14 },
  emptyState: { padding: 24, alignItems: 'center' },
  emptyStateText: { color: colors.textMuted, fontSize: 15, textAlign: 'center' },
});
