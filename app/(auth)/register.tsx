import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, useColorScheme, ActivityIndicator, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleRegister = async () => {
    if (!displayName.trim() || !username.trim() || !email.trim() || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await register(username.trim(), email.trim(), password, displayName.trim());
      if (result.success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setRegisteredEmail(email.trim());
        setShowConfirmation(true);
      } else {
        setError(result.error || 'Registration failed');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (icon: string, placeholder: string, value: string, onChangeText: (t: string) => void, opts: { secure?: boolean; autoCapitalize?: 'none' | 'words'; keyboardType?: 'email-address' | 'default' } = {}) => (
    <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={theme.textTertiary} />
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={opts.secure}
        autoCapitalize={opts.autoCapitalize || 'none'}
        autoCorrect={false}
        keyboardType={opts.keyboardType || 'default'}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      {showConfirmation ? (
        <View style={styles.confirmationContent}>
          <MaterialCommunityIcons name="email-check-outline" size={56} color={theme.accent} />
          <Text style={[styles.title, { color: theme.text }]}>Welcome to PowerMoves!</Text>
          <Text style={[styles.confirmSubtitle, { color: theme.textSecondary }]}>
            A confirmation email has been sent to
          </Text>
          <Text style={[styles.confirmEmail, { color: theme.accent }]}>{registeredEmail}</Text>
          <Text style={[styles.confirmSubtitle, { color: theme.textSecondary }]}>
            Please check your inbox to verify your email address.
          </Text>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1, width: '100%' as const }]}
            onPress={() => router.dismissAll()}
          >
            <Text style={styles.primaryButtonText}>Get Started</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.heroSection}>
            <MaterialCommunityIcons name="lightning-bolt" size={40} color={theme.primary} />
            <Text style={[styles.title, { color: theme.text }]}>Join PowerMoves</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Start scheduling your active lifestyle
            </Text>
          </View>

          {!!error && (
            <View style={[styles.errorBox, { backgroundColor: theme.danger + '15' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.danger} />
              <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
            </View>
          )}

          <View style={styles.form}>
            {renderInput('account-outline', 'Display Name', displayName, setDisplayName, { autoCapitalize: 'words' })}
            {renderInput('at', 'Username', username, setUsername)}
            {renderInput('email-outline', 'Email', email, setEmail, { keyboardType: 'email-address' })}
            {renderInput('lock-outline', 'Password', password, setPassword, { secure: true })}
            {renderInput('lock-check-outline', 'Confirm Password', confirmPassword, setConfirmPassword, { secure: true })}

            <Pressable
              style={({ pressed }) => [
                styles.primaryButton,
                { backgroundColor: theme.primary, opacity: pressed || loading ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
              onPress={handleRegister}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.primaryButtonText}>Create Account</Text>
              )}
            </Pressable>
          </View>

          <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Already have an account?
            </Text>
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.linkText, { color: theme.primary }]}>Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, gap: 20, justifyContent: 'center', flexGrow: 1 },
  confirmationContent: { flex: 1, padding: 24, justifyContent: 'center', alignItems: 'center', gap: 12 },
  confirmSubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  confirmEmail: { fontSize: 16, fontFamily: 'Inter_600SemiBold', textAlign: 'center' },
  heroSection: { alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  errorText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  form: { gap: 12 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, height: 52,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  primaryButton: {
    height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingTop: 20 },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  linkText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
