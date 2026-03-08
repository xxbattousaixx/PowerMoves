import React, { useState, useMemo, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable, TextInput,
  useColorScheme, RefreshControl, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Location from 'expo-location';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventContext';
import EventCard from '@/components/EventCard';
import TimePhaseIndicator from '@/components/TimePhaseIndicator';
import ActivityPicker from '@/components/ActivityPicker';

type TimeFilter = 'all' | 'morning' | 'afternoon' | 'evening';

const RADIUS_OPTIONS = [5, 10, 25, 50];

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const TIME_FILTERS: { key: TimeFilter; label: string; icon: string }[] = [
  { key: 'all', label: 'Any Time', icon: 'clock-outline' },
  { key: 'morning', label: 'Morning', icon: 'weather-sunny' },
  { key: 'afternoon', label: 'Afternoon', icon: 'white-balance-sunny' },
  { key: 'evening', label: 'Evening', icon: 'weather-night' },
];

function getHourFromTime(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/);
  if (!match) return 12;
  let hour = parseInt(match[1], 10);
  const ampm = match[3]?.toLowerCase();
  if (ampm === 'pm' && hour !== 12) hour += 12;
  if (ampm === 'am' && hour === 12) hour = 0;
  return hour;
}

function matchesTimeFilter(startTime: string, filter: TimeFilter): boolean {
  if (filter === 'all') return true;
  const hour = getHourFromTime(startTime);
  if (filter === 'morning') return hour >= 5 && hour < 12;
  if (filter === 'afternoon') return hour >= 12 && hour < 17;
  if (filter === 'evening') return hour >= 17 || hour < 5;
  return true;
}

export default function DiscoverScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { events, isLoading, refreshEvents } = useEvents();

  const [searchText, setSearchText] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [nearMeActive, setNearMeActive] = useState(false);
  const [nearMeRadius, setNearMeRadius] = useState(25);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback((text: string) => {
    setSearchText(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedQuery(text);
    }, 400);
  }, []);

  const clearSearch = useCallback(() => {
    setSearchText('');
    setDebouncedQuery('');
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
  }, []);

  const handleNearMeToggle = useCallback(async () => {
    if (nearMeActive) {
      setNearMeActive(false);
      return;
    }
    setLocationLoading(true);
    try {
      if (Platform.OS === 'web') {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 });
        });
        setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setNearMeActive(true);
      } else {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location Permission', 'Please enable location access to use Events Near Me.');
          return;
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        setNearMeActive(true);
      }
    } catch {
      Alert.alert('Location Error', 'Unable to get your location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  }, [nearMeActive]);

  const hasActiveFilters = !!selectedActivity || timeFilter !== 'all' || !!debouncedQuery.trim() || nearMeActive;

  const filteredEvents = useMemo(() => {
    let filtered = events.filter(e => e.status !== 'cancelled' && e.status !== 'completed');
    if (selectedActivity) {
      filtered = filtered.filter(e => e.activity === selectedActivity);
    }
    if (timeFilter !== 'all') {
      filtered = filtered.filter(e => matchesTimeFilter(e.startTime, timeFilter));
    }
    if (debouncedQuery.trim()) {
      const q = debouncedQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.location.toLowerCase().includes(q) ||
        e.title.toLowerCase().includes(q) ||
        e.activity.toLowerCase().includes(q)
      );
    }
    if (nearMeActive && userLocation) {
      filtered = filtered.filter(e => {
        if (e.latitude == null || e.longitude == null) return false;
        const dist = haversineDistance(userLocation.lat, userLocation.lng, e.latitude, e.longitude);
        return dist <= nearMeRadius;
      });
    }
    return filtered;
  }, [events, selectedActivity, timeFilter, debouncedQuery, nearMeActive, userLocation, nearMeRadius]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshEvents();
    setRefreshing(false);
  };

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const clearAllFilters = () => {
    setSelectedActivity(null);
    setTimeFilter('all');
    setNearMeActive(false);
    clearSearch();
  };

  const renderHeader = () => (
    <View style={styles.headerContent}>
      <View style={styles.titleRow}>
        <View>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>
            {user ? `Hey, ${user.displayName.split(' ')[0]}` : 'Welcome'}
          </Text>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Discover</Text>
        </View>
        {!user && (
          <Pressable
            style={[styles.signInBtn, { backgroundColor: theme.primary }]}
            onPress={() => router.push('/(auth)/login')}
          >
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        )}
      </View>

      <View style={[styles.motivationalBanner, { backgroundColor: theme.primary + '10', borderColor: theme.primary + '30' }]}>
        <MaterialCommunityIcons name="lightning-bolt" size={16} color={theme.primary} />
        <Text style={[styles.motivationalText, { color: theme.textSecondary }]}>
          Create or join events today to stay busy tomorrow!
        </Text>
      </View>

      <TimePhaseIndicator />

      <View style={styles.searchRow}>
        <View style={[styles.searchContainer, { backgroundColor: theme.inputBg, borderColor: theme.surfaceBorder }]}>
          <Ionicons name="search" size={18} color={theme.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search by location, event name..."
            placeholderTextColor={theme.textTertiary}
            value={searchText}
            onChangeText={handleSearchChange}
          />
          {!!searchText && (
            <Pressable onPress={clearSearch}>
              <Ionicons name="close-circle" size={18} color={theme.textTertiary} />
            </Pressable>
          )}
        </View>
        <Pressable
          style={[
            styles.nearMeBtn,
            {
              backgroundColor: nearMeActive ? theme.accent + '18' : theme.card,
              borderColor: nearMeActive ? theme.accent : theme.surfaceBorder,
            },
          ]}
          onPress={handleNearMeToggle}
          disabled={locationLoading}
        >
          {locationLoading ? (
            <ActivityIndicator size="small" color={theme.accent} />
          ) : (
            <MaterialCommunityIcons
              name="crosshairs-gps"
              size={20}
              color={nearMeActive ? theme.accent : theme.textSecondary}
            />
          )}
        </Pressable>
      </View>

      {nearMeActive && (
        <View style={styles.radiusSection}>
          <Text style={[styles.radiusLabel, { color: theme.textSecondary }]}>
            <MaterialCommunityIcons name="map-marker-radius-outline" size={13} color={theme.accent} /> Within
          </Text>
          <View style={styles.radiusRow}>
            {RADIUS_OPTIONS.map(r => (
              <Pressable
                key={r}
                style={[
                  styles.radiusChip,
                  {
                    backgroundColor: nearMeRadius === r ? theme.accent + '18' : theme.card,
                    borderColor: nearMeRadius === r ? theme.accent : 'transparent',
                  },
                ]}
                onPress={() => setNearMeRadius(r)}
              >
                <Text style={[styles.radiusChipText, { color: nearMeRadius === r ? theme.accent : theme.textSecondary }]}>
                  {r} mi
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Time</Text>
        </View>
        <View style={styles.timeFilterRow}>
          {TIME_FILTERS.map(tf => (
            <Pressable
              key={tf.key}
              style={[
                styles.timeChip,
                { backgroundColor: timeFilter === tf.key ? theme.primary + '18' : theme.card, borderColor: timeFilter === tf.key ? theme.primary : 'transparent' },
              ]}
              onPress={() => setTimeFilter(tf.key)}
            >
              <MaterialCommunityIcons
                name={tf.icon as any}
                size={14}
                color={timeFilter === tf.key ? theme.primary : theme.textTertiary}
              />
              <Text style={[styles.timeChipText, { color: timeFilter === tf.key ? theme.primary : theme.textSecondary }]}>
                {tf.label}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>Activity</Text>
          {selectedActivity && (
            <Pressable onPress={() => setSelectedActivity(null)}>
              <Text style={[styles.clearText, { color: theme.primary }]}>Clear</Text>
            </Pressable>
          )}
        </View>
        <ActivityPicker
          selected={selectedActivity}
          onSelect={(key) => setSelectedActivity(key === selectedActivity ? null : key)}
          horizontal
        />
      </View>

      <View style={styles.resultsHeader}>
        <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
          {filteredEvents.length} event{filteredEvents.length !== 1 ? 's' : ''} found
        </Text>
        {hasActiveFilters && (
          <Pressable onPress={clearAllFilters}>
            <Text style={[styles.clearText, { color: theme.primary }]}>Clear All</Text>
          </Pressable>
        )}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="calendar-blank-outline" size={48} color={theme.textTertiary} />
      <Text style={[styles.emptyTitle, { color: theme.textSecondary }]}>No events found</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textTertiary }]}>
        {hasActiveFilters ? 'Try a different filter or search' : 'Be the first to create one!'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <EventCard event={item} />
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + webTopInset, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />
        }
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { gap: 4 },
  headerContent: { gap: 16, paddingBottom: 12 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingTop: 8 },
  greeting: { fontSize: 13, fontFamily: 'Inter_400Regular' },
  pageTitle: { fontSize: 30, fontFamily: 'Inter_700Bold' },
  signInBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20 },
  signInText: { color: '#fff', fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  motivationalBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 16,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  motivationalText: { fontSize: 13, fontFamily: 'Inter_500Medium', flex: 1 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16 },
  searchContainer: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, height: 44, borderRadius: 12, borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: 'Inter_400Regular' },
  nearMeBtn: {
    width: 44, height: 44, borderRadius: 12, borderWidth: 1,
    alignItems: 'center' as const, justifyContent: 'center' as const,
  },
  radiusSection: { gap: 6, paddingHorizontal: 16 },
  radiusLabel: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  radiusRow: { flexDirection: 'row', gap: 8 },
  radiusChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, borderWidth: 1,
  },
  radiusChipText: { fontSize: 12, fontFamily: 'Inter_600SemiBold' },
  filterSection: { gap: 10 },
  filterHeader: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16 },
  sectionLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold', textTransform: 'uppercase' as const, letterSpacing: 0.5 },
  clearText: { fontSize: 13, fontFamily: 'Inter_500Medium' },
  timeFilterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
  timeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  timeChipText: { fontSize: 12, fontFamily: 'Inter_500Medium' },
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16 },
  cardWrapper: { paddingHorizontal: 16, paddingVertical: 4 },
  emptyContainer: { alignItems: 'center', gap: 8, paddingTop: 60, paddingBottom: 40 },
  emptyTitle: { fontSize: 17, fontFamily: 'Inter_600SemiBold' },
  emptySubtitle: { fontSize: 13, fontFamily: 'Inter_400Regular', textAlign: 'center' as const },
});
