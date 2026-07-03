import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { colors, fonts } from '@/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.paper },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.inkFaint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.hairline,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodyBold,
          fontSize: 10,
          letterSpacing: 0.8,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'LOG',
          tabBarIcon: ({ color }) => (
            <SymbolView name="list.bullet.rectangle.portrait" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'CALENDAR',
          tabBarIcon: ({ color }) => (
            <SymbolView name="calendar" tintColor={color} size={24} />
          ),
        }}
      />
      <Tabs.Screen
        name="stats"
        options={{
          title: 'STATS',
          tabBarIcon: ({ color }) => (
            <SymbolView name="chart.bar.fill" tintColor={color} size={24} />
          ),
        }}
      />
    </Tabs>
  );
}
