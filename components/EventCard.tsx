import React from 'react';
import { View, Text, StyleSheet, Pressable, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import Colors from '@/constants/colors';
import { PowerEvent } from '@/constants/types';
import { getActivity } from '@/constants/activities';

interface EventCardProps {
  event: PowerEvent;
  onPress?: () => void;
}

export default function EventCard({ event, onPress }: EventCardProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const activity = getActivity(event.activity);
  const activityColor = activity?.color || theme.primary;

  const spotsLeft = event.maxParticipants - event.participants.length;
  const isFull = spotsLeft <= 0;
  const isFree = event.cost === 0;
  const isAlmostFull = event.participants.length >= event.minParticipants && event.participants.length < event.maxParticipants;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({ pathname: '/event/[id]', params: { id: event.id } });
    }
  };

  const statusColors: Record<string, string> = {
    open: theme.accent,
    confirming: theme.warning,
    active: theme.primary,
    completed: theme.textTertiary,
    cancelled: theme.danger,
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        { backgroundColor: theme.card, opacity: pressed ? 0.92 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
      ]}
      onPress={handlePress}
    >
      <View style={[styles.activityBadge, { backgroundColor: activityColor + '18' }]}>
        {activity && (
          <MaterialCommunityIcons
            name={activity.icon as any}
            size={22}
            color={activityColor}
          />
        )}
      </View>

      {isAlmostFull && (
        <View style={[styles.boltBadge, { backgroundColor: theme.warning }]}>
          <MaterialCommunityIcons name="lightning-bolt" size={12} color="#fff" />
        </View>
      )}

      <View style={styles.content}>
        <View style={styles.topRow}>
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
            {event.title}
          </Text>
          <View style={[styles.statusDot, { backgroundColor: statusColors[event.status] || theme.textTertiary }]} />
        </View>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="map-marker-outline" size={13} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]} numberOfLines={1}>
            {event.location}
          </Text>
        </View>

        <View style={styles.metaRow}>
          <MaterialCommunityIcons name="clock-outline" size={13} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {event.startTime} - {event.endTime}
          </Text>
          <View style={styles.separator} />
          <MaterialCommunityIcons name="calendar-outline" size={13} color={theme.textSecondary} />
          <Text style={[styles.metaText, { color: theme.textSecondary }]}>
            {new Date(event.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
          </Text>
        </View>

        <View style={styles.bottomRow}>
          <View style={styles.participantsRow}>
            <MaterialCommunityIcons name="account-group-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.participantsText, { color: isFull ? theme.danger : theme.textSecondary }]}>
              {event.participants.length}/{event.maxParticipants}
            </Text>
          </View>

          <View style={[styles.costBadge, { backgroundColor: isFree ? theme.accent + '18' : theme.primary + '18' }]}>
            <Text style={[styles.costText, { color: isFree ? theme.accent : theme.primary }]}>
              {isFree ? 'Free' : `$${event.cost}`}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 14,
    gap: 12,
    position: 'relative' as const,
  },
  boltBadge: {
    position: 'absolute' as const,
    top: 6,
    right: 6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    zIndex: 2,
  },
  activityBadge: {
    width: 46,
    height: 46,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    gap: 5,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
    flex: 1,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
  },
  separator: {
    width: 1,
    height: 10,
    backgroundColor: '#444',
    marginHorizontal: 4,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 2,
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  participantsText: {
    fontSize: 12,
    fontFamily: 'Inter_500Medium',
  },
  costBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  costText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
  },
});
