import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, useColorScheme, ActivityIndicator, Alert, Platform, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';

type Step = 'email' | 'code' | 'newPassword' | 'success';

export default function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { requestPasswordReset, resetPassword } = useAuth();

  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetCode, setResetCode] = useState('');

  const handleRequestReset = async () => {
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await requestPasswordReset(email.trim());
      if (result.success) {
        setResetCode(result.code || '');
        Alert.alert(
          'Reset Code Sent',
          `A password reset code has been sent to ${email.trim()}.\n\nFor demo purposes, your code is: ${result.code}`,
          [{ text: 'OK', onPress: () => setStep('code') }]
        );
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setError(result.error || 'Failed to send reset code');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    if (!code.trim()) {
      setError('Please enter the reset code');
      return;
    }
    setError('');
    setStep('newPassword');
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      setError('Please fill in both fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const result = await resetPassword(email.trim(), code.trim(), newPassword);
      if (result.success) {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep('success');
      } else {
        setError(result.error || 'Failed to reset password');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const renderInput = (icon: string, placeholder: string, value: string, onChangeText: (t: string) => void, opts: { secure?: boolean; keyboardType?: 'email-address' | 'default' } = {}) => (
    <View style={[styles.inputContainer, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
      <MaterialCommunityIcons name={icon as any} size={20} color={theme.textTertiary} />
      <TextInput
        style={[styles.input, { color: theme.text }]}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={opts.secure}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType={opts.keyboardType || 'default'}
      />
    </View>
  );

  if (step === 'success') {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={styles.content}>
          <View style={styles.heroSection}>
            <MaterialCommunityIcons name="check-circle" size={56} color={theme.accent} />
            <Text style={[styles.title, { color: theme.text }]}>Password Reset</Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Your password has been successfully updated. You can now sign in with your new password.
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.primaryButtonText}>Back to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
      <View style={styles.heroSection}>
        <MaterialCommunityIcons
          name={step === 'email' ? 'email-outline' : step === 'code' ? 'numeric' : 'lock-reset'}
          size={40}
          color={theme.primary}
        />
        <Text style={[styles.title, { color: theme.text }]}>
          {step === 'email' ? 'Forgot Password?' : step === 'code' ? 'Enter Reset Code' : 'New Password'}
        </Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {step === 'email'
            ? 'Enter the email address associated with your account and we\'ll send you a reset code.'
            : step === 'code'
            ? `Enter the 6-digit code sent to ${email}`
            : 'Create a new password for your account.'}
        </Text>
      </View>

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: theme.danger + '15' }]}>
          <MaterialCommunityIcons name="alert-circle-outline" size={16} color={theme.danger} />
          <Text style={[styles.errorText, { color: theme.danger }]}>{error}</Text>
        </View>
      )}

      <View style={styles.form}>
        {step === 'email' && (
          <>
            {renderInput('email-outline', 'Email address', email, setEmail, { keyboardType: 'email-address' })}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary, opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleRequestReset}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Send Reset Code</Text>}
            </Pressable>
          </>
        )}

        {step === 'code' && (
          <>
            {renderInput('numeric', 'Enter 6-digit code', code, setCode)}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary, opacity: pressed ? 0.85 : 1 }]}
              onPress={handleVerifyCode}
            >
              <Text style={styles.primaryButtonText}>Verify Code</Text>
            </Pressable>
            <Pressable onPress={() => { setStep('email'); setCode(''); setError(''); }}>
              <Text style={[styles.linkText, { color: theme.primary, textAlign: 'center' }]}>Resend code</Text>
            </Pressable>
          </>
        )}

        {step === 'newPassword' && (
          <>
            {renderInput('lock-outline', 'New Password', newPassword, setNewPassword, { secure: true })}
            {renderInput('lock-check-outline', 'Confirm New Password', confirmPassword, setConfirmPassword, { secure: true })}
            <Pressable
              style={({ pressed }) => [styles.primaryButton, { backgroundColor: theme.primary, opacity: pressed || loading ? 0.85 : 1 }]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryButtonText}>Reset Password</Text>}
            </Pressable>
          </>
        )}
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        <Pressable onPress={() => router.back()}>
          <Text style={[styles.linkText, { color: theme.primary }]}>Back to Sign In</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, padding: 24, justifyContent: 'center', gap: 24 },
  scrollContent: { padding: 24, gap: 20, justifyContent: 'center', flexGrow: 1 },
  heroSection: { alignItems: 'center', gap: 8 },
  title: { fontSize: 26, fontFamily: 'Inter_700Bold', textAlign: 'center' },
  subtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center', lineHeight: 20 },
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
  footer: { alignItems: 'center', paddingTop: 20 },
  linkText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
});
