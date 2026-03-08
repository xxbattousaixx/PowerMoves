import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: 'minimal',
        headerStyle: { backgroundColor: 'transparent' },
        headerTintColor: '#FF4D00',
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="login" options={{ title: 'Sign In' }} />
      <Stack.Screen name="register" options={{ title: 'Create Account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
