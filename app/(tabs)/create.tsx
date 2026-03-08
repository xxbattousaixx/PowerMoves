import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable, ScrollView,
  useColorScheme, Alert, Platform, Switch, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventContext';
import ActivityPicker from '@/components/ActivityPicker';

export default function CreateScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { createEvent } = useEvents();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [activity, setActivity] = useState<string | null>(null);
  const [location, setLocation] = useState('');
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [minParticipants, setMinParticipants] = useState('2');
  const [maxParticipants, setMaxParticipants] = useState('10');
  const [cost, setCost] = useState('0');
  const [instructions, setInstructions] = useState('');
  const [requiresSafetyForm, setRequiresSafetyForm] = useState(false);
  const [safetyFormText, setSafetyFormText] = useState('');
  const [joinDeadline, setJoinDeadline] = useState<'tenAM' | 'noon'>('tenAM');
  const [allowEarlyStart, setAllowEarlyStart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [locationVerified, setLocationVerified] = useState(false);
  const [verifyingLocation, setVerifyingLocation] = useState(false);
  const [resolvedAddress, setResolvedAddress] = useState('');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.emptyState, { paddingTop: insets.top + webTopInset + 60 }]}>
          <MaterialCommunityIcons name="account-lock-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to create events</Text>
          <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
            You need an account to organize activities
          </Text>
          <Pressable
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.actionBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Missing Info', 'Please enter an event title');
    if (!activity) return Alert.alert('Missing Info', 'Please select an activity');
    if (!location.trim()) return Alert.alert('Missing Info', 'Please enter a location');
    if (!date.trim()) return Alert.alert('Missing Info', 'Please enter a date (YYYY-MM-DD)');
    if (!startTime.trim() || !endTime.trim()) return Alert.alert('Missing Info', 'Please enter start and end times');

    setLoading(true);
    try {
      let latitude: number | undefined;
      let longitude: number | undefined;
      try {
        const geocoded = await Location.geocodeAsync(location.trim());
        if (geocoded.length > 0) {
          latitude = geocoded[0].latitude;
          longitude = geocoded[0].longitude;
        }
      } catch {}

      const event = await createEvent({
        title: title.trim(),
        description: description.trim(),
        activity,
        creatorId: user.id,
        creatorName: user.displayName,
        location: location.trim(),
        latitude,
        longitude,
        date: date.trim(),
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        minParticipants: parseInt(minParticipants) || 2,
        maxParticipants: parseInt(maxParticipants) || 10,
        cost: parseFloat(cost) || 0,
        requiresSafetyForm,
        safetyFormText: safetyFormText.trim(),
        instructions: instructions.trim(),
        joinDeadline,
        allowEarlyStart,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTitle(''); setDescription(''); setActivity(null); setLocation('');
      setDate(''); setStartTime(''); setEndTime('');
      setMinParticipants('2'); setMaxParticipants('10'); setCost('0');
      setInstructions(''); setRequiresSafetyForm(false); setSafetyFormText('');
      setLocationVerified(false); setResolvedAddress('');
      setStep(0);
      router.push({ pathname: '/event/[id]', params: { id: event.id } });
    } catch {
      Alert.alert('Error', 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  const verifyLocation = async () => {
    if (!location.trim()) return;
    setVerifyingLocation(true);
    try {
      const geocoded = await Location.geocodeAsync(location.trim());
      if (geocoded.length > 0) {
        const { latitude, longitude } = geocoded[0];
        const reversed = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (reversed.length > 0) {
          const addr = reversed[0];
          const parts = [addr.name, addr.street, addr.city, addr.region, addr.postalCode].filter(Boolean);
          setResolvedAddress(parts.join(', '));
        } else {
          setResolvedAddress(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        }
        setLocationVerified(true);
      } else {
        Alert.alert('Location Not Found', 'Could not recognize this address. Please try a more specific location.');
      }
    } catch {
      Alert.alert('Verification Failed', 'Unable to verify this location. Please check your input.');
    } finally {
      setVerifyingLocation(false);
    }
  };

  const renderInput = (label: string, value: string, onChangeText: (t: string) => void, opts: { placeholder?: string; multiline?: boolean; keyboardType?: 'numeric' | 'default'; icon?: string } = {}) => (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={[styles.inputRow, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
        {opts.icon && <MaterialCommunityIcons name={opts.icon as any} size={18} color={theme.textTertiary} />}
        <TextInput
          style={[styles.input, { color: theme.text }, opts.multiline && styles.multilineInput]}
          placeholder={opts.placeholder || label}
          placeholderTextColor={theme.textTertiary}
          value={value}
          onChangeText={onChangeText}
          multiline={opts.multiline}
          keyboardType={opts.keyboardType || 'default'}
          textAlignVertical={opts.multiline ? 'top' : 'center'}
        />
      </View>
    </View>
  );

  const steps = [
    <View key="step0" style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>What's the activity?</Text>
      <ActivityPicker selected={activity} onSelect={setActivity} />
    </View>,

    <View key="step1" style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Event Details</Text>
      {renderInput('Event Title', title, setTitle, { placeholder: 'Morning Trail Hike', icon: 'format-title' })}
      {renderInput('Description', description, setDescription, { placeholder: 'Describe your event...', multiline: true, icon: 'text' })}
      {renderInput('Location', location, (v) => { setLocation(v); setLocationVerified(false); setResolvedAddress(''); }, { placeholder: 'Central Park, NYC', icon: 'map-marker-outline' })}
      {location.trim().length > 0 && (
        <View style={styles.verifyRow}>
          <Pressable
            style={[styles.verifyBtn, { backgroundColor: locationVerified ? theme.accent + '18' : theme.primary + '18', borderColor: locationVerified ? theme.accent : theme.primary }]}
            onPress={verifyLocation}
            disabled={verifyingLocation}
          >
            {verifyingLocation ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                <MaterialCommunityIcons
                  name={locationVerified ? 'check-circle' : 'map-search-outline'}
                  size={16}
                  color={locationVerified ? theme.accent : theme.primary}
                />
                <Text style={[styles.verifyBtnText, { color: locationVerified ? theme.accent : theme.primary }]}>
                  {locationVerified ? 'Verified' : 'Verify Address'}
                </Text>
              </>
            )}
          </Pressable>
          {locationVerified && !!resolvedAddress && (
            <Text style={[styles.resolvedText, { color: theme.accent }]} numberOfLines={2}>
              {resolvedAddress}
            </Text>
          )}
        </View>
      )}
    </View>,

    <View key="step2" style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>When & Who</Text>
      {renderInput('Date', date, setDate, { placeholder: 'YYYY-MM-DD', icon: 'calendar-outline' })}
      <View style={styles.rowInputs}>
        <View style={{ flex: 1 }}>
          {renderInput('Start Time', startTime, setStartTime, { placeholder: '10:00 AM', icon: 'clock-start' })}
        </View>
        <View style={{ flex: 1 }}>
          {renderInput('End Time', endTime, setEndTime, { placeholder: '12:00 PM', icon: 'clock-end' })}
        </View>
      </View>
      <View style={styles.rowInputs}>
        <View style={{ flex: 1 }}>
          {renderInput('Min Participants', minParticipants, setMinParticipants, { keyboardType: 'numeric', icon: 'account-minus-outline' })}
        </View>
        <View style={{ flex: 1 }}>
          {renderInput('Max Participants', maxParticipants, setMaxParticipants, { keyboardType: 'numeric', icon: 'account-plus-outline' })}
        </View>
      </View>
    </View>,

    <View key="step3" style={styles.stepContent}>
      <Text style={[styles.stepTitle, { color: theme.text }]}>Cost & Safety</Text>
      {renderInput('Cost per Person ($)', cost, setCost, { placeholder: '0 for free', keyboardType: 'numeric', icon: 'currency-usd' })}
      {renderInput('Instructions for Participants', instructions, setInstructions, { placeholder: 'Bring water, wear hiking boots...', multiline: true, icon: 'clipboard-text-outline' })}

      <View style={[styles.switchRow, { backgroundColor: theme.inputBg }]}>
        <View style={styles.switchLabel}>
          <MaterialCommunityIcons name="file-document-outline" size={20} color={theme.textSecondary} />
          <Text style={[styles.switchText, { color: theme.text }]}>Safety/Waiver Form</Text>
        </View>
        <Switch
          value={requiresSafetyForm}
          onValueChange={setRequiresSafetyForm}
          trackColor={{ true: theme.primary, false: theme.surfaceBorder }}
          thumbColor="#fff"
        />
      </View>

      {requiresSafetyForm && (
        renderInput('Safety Form Text', safetyFormText, setSafetyFormText, { placeholder: 'Waiver details...', multiline: true })
      )}

      <View style={[styles.switchRow, { backgroundColor: theme.inputBg }]}>
        <View style={styles.switchLabel}>
          <MaterialCommunityIcons name="clock-fast" size={20} color={theme.textSecondary} />
          <Text style={[styles.switchText, { color: theme.text }]}>Allow Early Start</Text>
        </View>
        <Switch
          value={allowEarlyStart}
          onValueChange={setAllowEarlyStart}
          trackColor={{ true: theme.primary, false: theme.surfaceBorder }}
          thumbColor="#fff"
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Join Deadline</Text>
        <View style={styles.deadlineRow}>
          {(['tenAM', 'noon'] as const).map(d => (
            <Pressable
              key={d}
              style={[
                styles.deadlineOption,
                {
                  backgroundColor: joinDeadline === d ? theme.primary + '18' : theme.inputBg,
                  borderColor: joinDeadline === d ? theme.primary : theme.surfaceBorder,
                },
              ]}
              onPress={() => setJoinDeadline(d)}
            >
              <Text style={[styles.deadlineText, { color: joinDeadline === d ? theme.primary : theme.textSecondary }]}>
                {d === 'tenAM' ? '10:00 AM' : '12:00 PM'}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>,
  ];

  const canProceed = () => {
    if (step === 0) return !!activity;
    if (step === 1) return !!title.trim() && !!location.trim();
    if (step === 2) return !!date.trim() && !!startTime.trim() && !!endTime.trim();
    return true;
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + webTopInset + 16, paddingBottom: 200 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Create Event</Text>
          <View style={styles.stepsRow}>
            {[0, 1, 2, 3].map(s => (
              <View
                key={s}
                style={[
                  styles.stepDot,
                  { backgroundColor: s <= step ? theme.primary : theme.surfaceBorder },
                ]}
              />
            ))}
          </View>
        </View>

        {steps[step]}
      </ScrollView>

      <View style={[styles.bottomBar, { backgroundColor: theme.surface, borderTopColor: theme.surfaceBorder, bottom: Platform.OS === 'web' ? 84 : 80, paddingBottom: 12 }]}>
        {step > 0 && (
          <Pressable
            style={[styles.backBtn, { borderColor: theme.surfaceBorder }]}
            onPress={() => setStep(step - 1)}
          >
            <MaterialCommunityIcons name="arrow-left" size={20} color={theme.text} />
          </Pressable>
        )}
        <Pressable
          style={({ pressed }) => [
            styles.nextBtn,
            {
              backgroundColor: canProceed() ? theme.primary : theme.surfaceBorder,
              opacity: pressed ? 0.85 : 1,
              flex: 1,
            },
          ]}
          onPress={() => {
            if (step < 3) {
              if (canProceed()) setStep(step + 1);
            } else {
              handleCreate();
            }
          }}
          disabled={!canProceed() || loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <Text style={styles.nextBtnText}>
              {step < 3 ? 'Continue' : 'Create Event'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, gap: 8 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  stepsRow: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },
  stepContent: { gap: 14 },
  stepTitle: { fontSize: 20, fontFamily: 'Inter_600SemiBold', marginBottom: 4 },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 12, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, minHeight: 48 },
  input: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular', paddingVertical: 12 },
  multilineInput: { minHeight: 80 },
  rowInputs: { flexDirection: 'row', gap: 10 },
  verifyRow: { gap: 6 },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' as const, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1 },
  verifyBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  resolvedText: { fontSize: 12, fontFamily: 'Inter_400Regular', paddingLeft: 4 },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: 12 },
  switchLabel: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  switchText: { fontSize: 14, fontFamily: 'Inter_500Medium' },
  deadlineRow: { flexDirection: 'row', gap: 10 },
  deadlineOption: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5 },
  deadlineText: { fontSize: 14, fontFamily: 'Inter_600SemiBold' },
  bottomBar: { position: 'absolute' as const, bottom: 0, left: 0, right: 0, flexDirection: 'row', gap: 10, paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1 },
  backBtn: { width: 48, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  nextBtnText: { color: '#fff', fontSize: 16, fontFamily: 'Inter_600SemiBold' },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 14, fontFamily: 'Inter_400Regular', textAlign: 'center' },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  actionBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
});
