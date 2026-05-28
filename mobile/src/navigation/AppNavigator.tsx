// ============================================================================
// دروب (Droob) — App Navigation (Guest-first, no login required)
// Flow: Onboarding → MainTabs (Home, Planner, Departures)
// Auth available later for payment features
// ============================================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, fontWeight } from '@theme/tokens';
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import TripPlannerScreen from '../screens/TripPlannerScreen';
import DeparturesScreen from '../screens/DeparturesScreen';
import RouteDetailScreen from '../screens/RouteDetailScreen';
import StopDetailScreen from '../screens/StopDetailScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  RouteDetail: { routeId: string };
  StopDetail: { stopId: string; stopName: string };
};

export type MainTabParamList = {
  Home: undefined;
  TripPlanner: undefined;
  Departures: { stopId?: string; stopName?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.brand_blue,
        tabBarInactiveTintColor: colors.text_tertiary,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopWidth: 0.5,
          borderTopColor: colors.border,
          height: 64,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarLabelStyle: {
          fontFamily: 'IBM Plex Sans Arabic',
          fontSize: 11,
          fontWeight: fontWeight.bold,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons: Record<string, string> = { Home: '🗺️', TripPlanner: '🧭', Departures: '🕐' };
          return (
            <React.Fragment>
              {React.createElement('Text' as any, { style: { fontSize: focused ? 22 : 18 } }, icons[route.name] || '📍')}
            </React.Fragment>
          );
        },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'الخريطة' }} />
      <Tab.Screen name="TripPlanner" component={TripPlannerScreen} options={{ tabBarLabel: 'المخطط' }} />
      <Tab.Screen name="Departures" component={DeparturesScreen} options={{ tabBarLabel: 'المغادرات' }} />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
        <Stack.Screen name="Onboarding">
          {(props) => <OnboardingScreen onComplete={() => (props.navigation as any).replace('MainTabs')} />}
        </Stack.Screen>
        <Stack.Screen name="MainTabs" component={MainTabs} />
        <Stack.Screen name="RouteDetail" component={RouteDetailScreen}
          options={{ headerShown: true, headerTitle: 'تفاصيل الخط', headerBackTitle: 'رجوع' }} />
        <Stack.Screen name="StopDetail" component={StopDetailScreen}
          options={{ headerShown: true, headerTitle: 'تفاصيل المحطة', headerBackTitle: 'رجوع' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
