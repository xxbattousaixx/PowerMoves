import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, Pressable,
  useColorScheme, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { useAuth } from '@/contexts/AuthContext';
import { useEvents } from '@/contexts/EventContext';
import EventCard from '@/components/EventCard';
import TimePhaseIndicator from '@/components/TimePhaseIndicator';

type Tab = 'upcoming' | 'created' | 'past';

export default function ScheduleScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { events } = useEvents();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const webTopInset = Platform.OS === 'web' ? 67 : 0;

  const userId = user?.id || '';
  const userEvents = useMemo(() => userId ? events.filter(e => e.participants.includes(userId)) : [], [events, userId]);
  const createdEvents = useMemo(() => userId ? events.filter(e => e.creatorId === userId) : [], [events, userId]);
  const upcomingEvents = useMemo(() => userEvents.filter(e => e.status !== 'completed' && e.status !== 'cancelled'), [userEvents]);
  const pastEvents = useMemo(() => userEvents.filter(e => e.status === 'completed' || e.status === 'cancelled'), [userEvents]);

  const tabData: Record<Tab, { events: typeof events; emptyIcon: string; emptyText: string }> = {
    upcoming: { events: upcomingEvents, emptyIcon: 'calendar-check-outline', emptyText: 'No upcoming events' },
    created: { events: createdEvents, emptyIcon: 'plus-circle-outline', emptyText: 'No events created yet' },
    past: { events: pastEvents, emptyIcon: 'history', emptyText: 'No past events' },
  };

  const currentTabData = tabData[activeTab];

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: upcomingEvents.length },
    { key: 'created', label: 'Created', count: createdEvents.length },
    { key: 'past', label: 'Past', count: pastEvents.length },
  ];

  if (!user) {
    return (
      <View style={[styles.container, { backgroundColor: theme.bg }]}>
        <View style={[styles.emptyState, { paddingTop: insets.top + webTopInset + 60 }]}>
          <MaterialCommunityIcons name="calendar-clock-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Sign in to view your schedule</Text>
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

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <FlatList
        data={currentTabData.events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardWrapper}>
            <EventCard event={item} />
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text style={[styles.pageTitle, { color: theme.text }]}>My Schedule</Text>
            <TimePhaseIndicator compact />

            <View style={[styles.tabBar, { backgroundColor: theme.surface }]}>
              {tabs.map(tab => (
                <Pressable
                  key={tab.key}
                  style={[
                    styles.tab,
                    activeTab === tab.key && { backgroundColor: theme.primary + '18' },
                  ]}
                  onPress={() => setActiveTab(tab.key)}
                >
                  <Text style={[
                    styles.tabLabel,
                    { color: activeTab === tab.key ? theme.primary : theme.textSecondary },
                  ]}>
                    {tab.label}
                  </Text>
                  {tab.count > 0 && (
                    <View style={[styles.badge, { backgroundColor: activeTab === tab.key ? theme.primary : theme.surfaceBorder }]}>
                      <Text style={[styles.badgeText, { color: activeTab === tab.key ? '#fff' : theme.textSecondary }]}>
                        {tab.count}
                      </Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <MaterialCommunityIcons name={currentTabData.emptyIcon as any} size={40} color={theme.textTertiary} />
            <Text style={[styles.emptyListText, { color: theme.textSecondary }]}>{currentTabData.emptyText}</Text>
          </View>
        }
        contentContainerStyle={[
          styles.listContent,
          { paddingTop: insets.top + webTopInset + 16, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  listContent: { gap: 4 },
  header: { gap: 12, paddingHorizontal: 16, paddingBottom: 8 },
  pageTitle: { fontSize: 28, fontFamily: 'Inter_700Bold' },
  tabBar: { flexDirection: 'row', borderRadius: 12, padding: 4, gap: 4 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  tabLabel: { fontSize: 13, fontFamily: 'Inter_600SemiBold' },
  badge: { paddingHorizontal: 7, paddingVertical: 1, borderRadius: 10, minWidth: 20, alignItems: 'center' },
  badgeText: { fontSize: 11, fontFamily: 'Inter_600SemiBold' },
  cardWrapper: { paddingHorizontal: 16, paddingVertical: 4 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold' },
  actionBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  actionBtnText: { color: '#fff', fontSize: 15, fontFamily: 'Inter_600SemiBold' },
  emptyList: { alignItems: 'center', gap: 8, paddingTop: 60 },
  emptyListText: { fontSize: 15, fontFamily: 'Inter_500Medium' },
});
