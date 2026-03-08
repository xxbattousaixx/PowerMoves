import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, useColorScheme, ActivityIndicator, Platform } from 'react-native';
import { Link, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setError('Please fill in all fields');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      if (result.success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.dismissAll();
      } else {
        setError(result.error || 'Login failed');
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={styles.content}>
        <View style={styles.heroSection}>
          <MaterialCommunityIcons name="lightning-bolt" size={44} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Welcome Back</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign in to your PowerMoves account
          </Text>
        </View>

        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: theme.danger + '15' }]}>
            <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.danger} />
            <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
          </View>
        )}

        <View style={styles.form}>
          <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
            <MaterialCommunityIcons name="account-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Username"
              placeholderTextColor={theme.textTertiary}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
            <MaterialCommunityIcons name="lock-outline" size={20} color={theme.textTertiary} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Password"
              placeholderTextColor={theme.textTertiary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <Pressable onPress={() => setShowPassword(!showPassword)}>
              <MaterialCommunityIcons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={theme.textTertiary}
              />
            </Pressable>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.primaryButton,
              { backgroundColor: theme.primary, opacity: pressed || loading ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryButtonText}>Sign In</Text>
            )}
          </Pressable>

          <Pressable style={styles.forgotRow} onPress={() => router.push('/(auth)/forgot-password')}>
            <Text style={[styles.forgotText, { color: theme.textSecondary }]}>Forgot your password?</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          Don't have an account?
        </Text>
        <Link href="/(auth)/register" asChild>
          <Pressable>
            <Text style={[styles.linkText, { color: theme.primary }]}>Sign Up</Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 24 },
  heroSection: { alignItems: 'center', gap: 8, marginBottom: 8 },
  title: { fontSize: 28, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 15, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10 },
  errorText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  form: { gap: 14 },
  inputContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, height: 52,
  },
  input: { flex: 1, fontSize: 15, fontFamily: 'Inter_400Regular' },
  primaryButton: {
    height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 4,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  forgotRow: { alignItems: 'center', marginTop: 4 },
  forgotText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  footer: { flexDirection: 'row', justifyContent: 'center', gap: 6, padding: 16 },
  footerText: { fontSize: 14, fontFamily: 'Inter_400Regular' },
  linkText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
