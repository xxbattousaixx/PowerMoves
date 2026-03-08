import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { getCurrentPhase, getPhaseInfo, TimePhase } from '@/constants/types';

export default function TimePhaseIndicator({ compact = false }: { compact?: boolean }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;
  const [phase, setPhase] = useState<TimePhase>(getCurrentPhase());

  useEffect(() => {
    const interval = setInterval(() => {
      setPhase(getCurrentPhase());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const info = getPhaseInfo(phase);
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const phases: TimePhase[] = ['creation', 'confirmation', 'active'];

  if (compact) {
    return (
      <View style={[styles.compactContainer, { backgroundColor: info.color + '18' }]}>
        <View style={[styles.compactDot, { backgroundColor: info.color }]} />
        <Text style={[styles.compactLabel, { color: info.color }]}>{info.label}</Text>
        <Text style={[styles.compactTime, { color: theme.textSecondary }]}>{timeStr}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="clock-outline" size={20} color={info.color} />
        <Text style={[styles.timeText, { color: theme.text }]}>{timeStr}</Text>
      </View>
      <View style={styles.phaseBar}>
        {phases.map((p, i) => {
          const pInfo = getPhaseInfo(p);
          const isActive = p === phase;
          const isPast = phases.indexOf(phase) > i;
          return (
            <View key={p} style={styles.phaseSegment}>
              <View style={[
                styles.segmentBar,
                {
                  backgroundColor: isActive ? pInfo.color : isPast ? pInfo.color + '60' : theme.surfaceBorder,
                },
              ]} />
              <Text style={[
                styles.segmentLabel,
                {
                  color: isActive ? pInfo.color : theme.textTertiary,
                  fontFamily: isActive ? 'Inter_600SemiBold' : 'Inter_400Regular',
                },
              ]}>
                {pInfo.label.split(' ')[0]}
              </Text>
              <Text style={[styles.segmentTime, { color: theme.textTertiary }]}>
                {pInfo.sublabel}
              </Text>
            </View>
          );
        })}
      </View>
      <View style={[styles.descriptionRow, { backgroundColor: info.color + '12' }]}>
        <MaterialCommunityIcons
          name={phase === 'creation' ? 'plus-circle-outline' : phase === 'confirmation' ? 'check-circle-outline' : 'play-circle-outline'}
          size={18}
          color={info.color}
        />
        <Text style={[styles.descriptionText, { color: info.color }]}>{info.description}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeText: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  phaseBar: {
    flexDirection: 'row',
    gap: 8,
  },
  phaseSegment: {
    flex: 1,
    gap: 4,
  },
  segmentBar: {
    height: 4,
    borderRadius: 2,
  },
  segmentLabel: {
    fontSize: 11,
  },
  segmentTime: {
    fontSize: 9,
    fontFamily: 'Inter_400Regular',
  },
  descriptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  descriptionText: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactLabel: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
  },
  compactTime: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
  },
});
