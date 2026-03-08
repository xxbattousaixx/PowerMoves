import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, useColorScheme } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Colors from '@/constants/colors';
import { ACTIVITIES, Activity } from '@/constants/activities';

interface ActivityPickerProps {
  selected: string | null;
  onSelect: (key: string) => void;
  horizontal?: boolean;
  multiSelect?: boolean;
  selectedKeys?: string[];
  onMultiSelect?: (keys: string[]) => void;
}

export default function ActivityPicker({ selected, onSelect, horizontal, multiSelect, selectedKeys = [], onMultiSelect }: ActivityPickerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? Colors.dark : Colors.light;

  const handlePress = (key: string) => {
    if (multiSelect && onMultiSelect) {
      if (selectedKeys.includes(key)) {
        onMultiSelect(selectedKeys.filter(k => k !== key));
      } else {
        onMultiSelect([...selectedKeys, key]);
      }
    } else {
      onSelect(key);
    }
  };

  const isSelected = (key: string) => {
    if (multiSelect) return selectedKeys.includes(key);
    return selected === key;
  };

  const renderItem = (activity: Activity) => (
    <Pressable
      key={activity.key}
      style={({ pressed }) => [
        horizontal ? styles.horizontalItem : styles.gridItem,
        {
          backgroundColor: isSelected(activity.key) ? activity.color + '22' : theme.surface,
          borderColor: isSelected(activity.key) ? activity.color : theme.surfaceBorder,
          borderWidth: 1.5,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
      onPress={() => handlePress(activity.key)}
    >
      <MaterialCommunityIcons
        name={activity.icon as any}
        size={horizontal ? 20 : 26}
        color={isSelected(activity.key) ? activity.color : theme.textSecondary}
      />
      <Text
        style={[
          horizontal ? styles.horizontalLabel : styles.gridLabel,
          { color: isSelected(activity.key) ? activity.color : theme.textSecondary },
        ]}
        numberOfLines={1}
      >
        {activity.label}
      </Text>
    </Pressable>
  );

  if (horizontal) {
    return (
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalContainer}>
        {ACTIVITIES.map(renderItem)}
      </ScrollView>
    );
  }

  return (
    <View style={styles.gridContainer}>
      {ACTIVITIES.map(renderItem)}
    </View>
  );
}

const styles = StyleSheet.create({
  horizontalContainer: {
    gap: 8,
    paddingHorizontal: 16,
  },
  horizontalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  horizontalLabel: {
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  gridItem: {
    width: '30%' as any,
    alignItems: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
    flexGrow: 1,
    minWidth: 95,
    maxWidth: '33%' as any,
  },
  gridLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    textAlign: 'center',
  },
});
