import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { SymbolView } from 'expo-symbols';
import { type ColorValue, Platform } from 'react-native';

// SF Symbols (expo-symbols) render nothing on Android, so every icon needs a
// Material fallback registered here. Keys are the SF Symbol names used on iOS.
const MATERIAL_FALLBACKS = {
  'list.bullet.rectangle.portrait': 'list-alt',
  calendar: 'calendar-today',
  'chart.bar.fill': 'bar-chart',
  'gearshape.fill': 'settings',
} as const;

export type IconName = keyof typeof MATERIAL_FALLBACKS;

export function Icon({ name, color, size }: { name: IconName; color: ColorValue; size: number }) {
  if (Platform.OS === 'ios') {
    return <SymbolView name={name} tintColor={color} size={size} />;
  }
  return <MaterialIcons name={MATERIAL_FALLBACKS[name]} color={color} size={size} />;
}
