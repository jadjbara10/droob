// ============================================================================
// دروب (Droob) — Full App Navigation (React Navigation v7)
// Flow: Onboarding → Auth → MainTabs (Map, Planner, Departures, Saved)
// ============================================================================

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/transport.config';

// ─── Screens ─────────────────────────────────────────────────────────────────
import OnboardingScreen from '../screens/OnboardingScreen';
import AuthScreen from '../screens/AuthScreen';
import MapScreen from '../screens/MapScreen';
import TripPlannerScreen from '../screens/TripPlannerScreen';
import DeparturesScreen from '../screens/DeparturesScreen';
import SavedRoutesScreen from '../screens/SavedRoutesScreen';
import AlertsScreen from '../screens/AlertsScreen';
import RouteDetailScreen from '../screens/RouteDetailScreen';
import StopDetailScreen from '../screens/StopDetailScreen';
import JourneyDetailScreen from '../screens/JourneyDetailScreen';
import CommunityScreen from '../screens/CommunityScreen';

// ─── Param Lists ─────────────────────────────────────────────────────────────
export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  MainTabs: undefined;
  RouteDetail: { routeId: string };
  StopDetail: { stopId: string; stopName: string };
  JourneyDetail: { journeyId: string };
};

export type MainTabParamList = {
  Home: undefined;
  TripPlanner: undefined;
  Departures: { stopId?: string; stopName?: string };
  Saved: undefined;
  Alerts: undefined;
  Community: undefined;
};

// ─── Navigators ─────────────────────────────────────────────────────────────
const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Tab Bar Icon Helper ─────────────────────────────────────────────────────
function getTabIcon(routeName: string, focused: boolean): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (routeName) {
    case 'Home': return focused ? 'map' : 'map-outline';
    case 'TripPlanner': return focused ? 'routes' : 'routes';
    case 'Departures': return focused ? 'clipboard-text-clock' : 'clipboard-text-clock-outline';
    case 'Saved': return focused ? 'bookmark' : 'bookmark-outline';
    case 'Alerts': return focused ? 'bell-ring' : 'bell-ring-outline';
    case 'Community': return focused ? 'account-group' : 'account-group-outline';
    default: return 'map';
  }
}

// ─── Main Bottom Tab Navigator ───────────────────────────────────────────────
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 0.5,
          borderTopColor: COLORS.border,
          height: 70,
          paddingBottom: 12,
          paddingTop: 8,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 8,
        },
        tabBarLabelStyle: {
          fontFamily: 'System',
          fontSize: 11,
          fontWeight: '700',
        },
        tabBarIcon: ({ focused, color, size }) => (
          <MaterialCommunityIcons
            name={getTabIcon(route.name, focused)}
            size={focused ? 26 : 24}
            color={color}
          />
        ),
      })}
    >
      <Tab.Screen
        name="Home"
        component={MapScreen}
        options={{ tabBarLabel: 'الخريطة' }}
      />
      <Tab.Screen
        name="TripPlanner"
        component={TripPlannerScreen}
        options={{ tabBarLabel: 'المخطط' }}
      />
      <Tab.Screen
        name="Departures"
        component={DeparturesScreen}
        options={{ tabBarLabel: 'المغادرة' }}
      />
      <Tab.Screen
        name="Saved"
        component={SavedRoutesScreen}
        options={{ tabBarLabel: 'المحفوظات' }}
      />
      <Tab.Screen
        name="Alerts"
        component={AlertsScreen}
        options={{ tabBarLabel: 'التنبيهات' }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityScreen}
        options={{ tabBarLabel: 'المجتمع' }}
      />
    </Tab.Navigator>
  );
}

// ─── Root Stack Navigator ────────────────────────────────────────────────────
export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: '#F3F4F6' },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
        />
        <Stack.Screen
          name="Auth"
          component={AuthScreen}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />
        <Stack.Screen
          name="RouteDetail"
          component={RouteDetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'تفاصيل الخط',
            headerBackTitle: 'رجوع',
            headerTitleStyle: { fontFamily: 'System', fontWeight: '800', fontSize: 18 },
          }}
        />
        <Stack.Screen
          name="StopDetail"
          component={StopDetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'تفاصيل المحطة',
            headerBackTitle: 'رجوع',
            headerTitleStyle: { fontFamily: 'System', fontWeight: '800', fontSize: 18 },
          }}
        />
        <Stack.Screen
          name="JourneyDetail"
          component={JourneyDetailScreen}
          options={{
            headerShown: true,
            headerTitle: 'تفاصيل الرحلة',
            headerBackTitle: 'رجوع',
            headerTitleStyle: { fontFamily: 'System', fontWeight: '800', fontSize: 18 },
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}