import { Tabs } from 'expo-router';

import { Icon } from '@/components/Icon';
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
        name="log"
        options={{
          title: 'LOG',
          tabBarIcon: ({ color }) => (
            <Icon name="list.bullet.rectangle.portrait" color={color} size={24} />
          ),
        }}
      />
      {/* Stats is the app's entry point, so it owns the group's index route —
          the launch URL "/" has to resolve to a file named index.tsx. Tab
          order stays LOG · STATS · CALENDAR, set by declaration order here. */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'STATS',
          tabBarIcon: ({ color }) => <Icon name="chart.bar.fill" color={color} size={24} />,
        }}
      />
      <Tabs.Screen
        name="calendar"
        options={{
          title: 'CALENDAR',
          tabBarIcon: ({ color }) => <Icon name="calendar" color={color} size={24} />,
        }}
      />
    </Tabs>
  );
}
