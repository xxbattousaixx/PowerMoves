export interface Activity {
  key: string;
  label: string;
  icon: string;
  iconFamily: 'MaterialCommunityIcons' | 'Ionicons' | 'Feather';
  color: string;
}

export const ACTIVITIES: Activity[] = [
  { key: 'hiking', label: 'Hiking', icon: 'hiking', iconFamily: 'MaterialCommunityIcons', color: '#4CAF50' },
  { key: 'soccer', label: 'Soccer', icon: 'soccer', iconFamily: 'MaterialCommunityIcons', color: '#2196F3' },
  { key: 'chess', label: 'Chess', icon: 'chess-knight', iconFamily: 'MaterialCommunityIcons', color: '#795548' },
  { key: 'studying', label: 'Studying', icon: 'book-open-variant', iconFamily: 'MaterialCommunityIcons', color: '#9C27B0' },
  { key: 'football', label: 'Football', icon: 'football', iconFamily: 'MaterialCommunityIcons', color: '#FF5722' },
  { key: 'swimming', label: 'Swimming', icon: 'swim', iconFamily: 'MaterialCommunityIcons', color: '#00BCD4' },
  { key: 'jogging', label: 'Jogging', icon: 'run', iconFamily: 'MaterialCommunityIcons', color: '#FF9800' },
  { key: 'walking', label: 'Walking', icon: 'walk', iconFamily: 'MaterialCommunityIcons', color: '#8BC34A' },
  { key: 'dog_walking', label: 'Dog Walking', icon: 'dog', iconFamily: 'MaterialCommunityIcons', color: '#CDDC39' },
  { key: 'fishing', label: 'Fishing', icon: 'fish', iconFamily: 'MaterialCommunityIcons', color: '#607D8B' },
  { key: 'surfing', label: 'Surfing', icon: 'surfing', iconFamily: 'MaterialCommunityIcons', color: '#03A9F4' },
  { key: 'wakeboarding', label: 'Wakeboarding', icon: 'ski-water', iconFamily: 'MaterialCommunityIcons', color: '#0097A7' },
  { key: 'bicycling', label: 'Bicycling', icon: 'bicycle', iconFamily: 'MaterialCommunityIcons', color: '#E91E63' },
  { key: 'basketball', label: 'Basketball', icon: 'basketball', iconFamily: 'MaterialCommunityIcons', color: '#FF5722' },
  { key: 'tennis', label: 'Tennis', icon: 'tennis', iconFamily: 'MaterialCommunityIcons', color: '#FFEB3B' },
  { key: 'volleyball', label: 'Volleyball', icon: 'volleyball', iconFamily: 'MaterialCommunityIcons', color: '#FFC107' },
  { key: 'yoga', label: 'Yoga', icon: 'yoga', iconFamily: 'MaterialCommunityIcons', color: '#CE93D8' },
  { key: 'rock_climbing', label: 'Rock Climbing', icon: 'carabiner', iconFamily: 'MaterialCommunityIcons', color: '#A1887F' },
  { key: 'kayaking', label: 'Kayaking', icon: 'kayaking', iconFamily: 'MaterialCommunityIcons', color: '#26C6DA' },
  { key: 'golf', label: 'Golf', icon: 'golf', iconFamily: 'MaterialCommunityIcons', color: '#66BB6A' },
  { key: 'skateboarding', label: 'Skateboarding', icon: 'skateboard', iconFamily: 'MaterialCommunityIcons', color: '#EF5350' },
  { key: 'dancing', label: 'Dancing', icon: 'dance-ballroom', iconFamily: 'MaterialCommunityIcons', color: '#AB47BC' },
  { key: 'boxing', label: 'Boxing', icon: 'boxing-glove', iconFamily: 'MaterialCommunityIcons', color: '#D32F2F' },
  { key: 'martial_arts', label: 'Martial Arts', icon: 'karate', iconFamily: 'MaterialCommunityIcons', color: '#F44336' },
  { key: 'photography', label: 'Photography', icon: 'camera', iconFamily: 'MaterialCommunityIcons', color: '#78909C' },
];

export function getActivity(key: string): Activity | undefined {
  return ACTIVITIES.find(a => a.key === key);
}
