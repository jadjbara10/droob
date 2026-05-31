// ============================================================================
// دروب (Droob) — App Navigation (Guest-first, no login required)
// Flow: Onboarding → MainTabs (Home, Planner, Departures)
// Stack: Search (modal), RouteDetail, StopDetail, JourneyDetail, Navigation,
//        Alerts, SavedRoutes
// Auth available later for payment features
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { colors, spacing, radius, fontSize, fontWeight, shadows } from '@theme/tokens';
import linkingConfig from './linking';
import type { Journey } from '../types/transit.types';

// Screens
import OnboardingScreen from '../screens/OnboardingScreen';
import HomeScreen from '../screens/HomeScreen';
import TripPlannerScreen from '../screens/TripPlannerScreen';
import DeparturesScreen from '../screens/DeparturesScreen';
import SearchScreen from '../screens/SearchScreen';
import RouteDetailScreen from '../screens/RouteDetailScreen';
import StopDetailScreen from '../screens/StopDetailScreen';
import JourneyDetailScreen from '../screens/JourneyDetailScreen';
import NavigationScreen from '../screens/NavigationScreen';
import AlertsScreen from '../screens/AlertsScreen';
import SavedRoutesScreen from '../screens/SavedRoutesScreen';
import CommunityScreen from '../screens/CommunityScreen';
import AuthScreen from '../screens/AuthScreen';
import MapScreen from '../screens/MapScreen';

// ─── Param Lists ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Search: { mode?: 'origin' | 'destination' | 'general' };
  RouteDetail: { routeId: string; routeName?: string };
  StopDetail: { stopId: string; stopName: string };
  JourneyDetail: { journeyId?: string; journey?: Journey };
  Navigation: undefined;
  Alerts: undefined;
  SavedRoutes: undefined;
  Community: undefined;
  Auth: undefined;
  Map: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  TripPlanner: undefined;
  Departures: { stopId?: string; stopName?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// ─── Active Trip Context ──────────────────────────────────────────────────

interface ActiveTripContextValue {
  isNavigating: boolean;
  startNavigation: () => void;
  stopNavigation: () => void;
  tripLabel: string;
  setTripLabel: (label: string) => void;
}

const ActiveTripContext = createContext<ActiveTripContextValue>({
  isNavigating: false,
  startNavigation: () => {},
  stopNavigation: () => {},
  tripLabel: '',
  setTripLabel: () => {},
});

export const useActiveTrip = () => useContext(ActiveTripContext);

function ActiveTripProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [tripLabel, setTripLabel] = useState('');
  const startNavigation = useCallback(() => setIsNavigating(true), []);
  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setTripLabel('');
  }, []);

  return (
    <ActiveTripContext.Provider value={{ isNavigating, startNavigation, stopNavigation, tripLabel, setTripLabel }}>
      {children}
    </ActiveTripContext.Provider>
  );
}

// ─── Active Trip Banner ───────────────────────────────────────────────────

function ActiveTripBanner() {
  const { isNavigating, tripLabel, stopNavigation } = useActiveTrip();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  if (!isNavigating) return null;

  return (
    <TouchableOpacity
      style={styles.tripBanner}
      activeOpacity={0.9}
      onPress={() => navigation.navigate('Navigation')}
      accessibilityRole="button"
      accessibilityLabel={tripLabel ? `رحلة نشطة إلى ${tripLabel}` : 'رحلة نشطة — اضغط للعودة'}
    >
      <View style={styles.tripBannerDot} />
      <Text style={styles.tripBannerLabel} numberOfLines={1}>
        {tripLabel ? `🧭 ${tripLabel}` : '🧭 رحلة نشطة'}
      </Text>
      <TouchableOpacity
        onPress={(e) => { e.stopPropagation(); stopNavigation(); }}
        style={styles.tripBannerClose}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Text style={styles.tripBannerCloseText}>✕</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── NavigationScreen Wrapper ─────────────────────────────────────────────

function NavigationScreenWrapper() {
  const { startNavigation, stopNavigation, setTripLabel } = useActiveTrip();

  useEffect(() => {
    startNavigation();
    setTripLabel('رحلة حالية');
    return () => {
      stopNavigation();
    };
  }, []);

  return <NavigationScreen />;
}

// ─── Main Tabs ────────────────────────────────────────────────────────────

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

// ─── Default header options for detail screens ────────────────────────────

const detailHeaderOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.brand_blue,
  headerTitleStyle: {
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: fontSize[16],
    fontWeight: fontWeight.semiBold as any,
    color: colors.text_primary,
  },
  headerBackTitle: 'رجوع' as string | undefined,
};

// ═══════════════════════════════════════════════════════════════════════════
//  AppNavigator
// ═══════════════════════════════════════════════════════════════════════════

export default function AppNavigator() {
  return (
    <ActiveTripProvider>
      <NavigationContainer linking={linkingConfig}>
        <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          {/* Onboarding — entry flow */}
          <Stack.Screen name="Onboarding">
            {(props) => <OnboardingScreen onComplete={() => (props.navigation as any).replace('MainTabs')} />}
          </Stack.Screen>

          {/* Main Tabs */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* Search — modal presentation */}
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
          />

          {/* Route Detail */}
          <Stack.Screen
            name="RouteDetail"
            component={RouteDetailScreen}
            options={{
              headerShown: true,
              headerTitle: 'تفاصيل الخط',
              ...detailHeaderOptions,
            }}
          />

          {/* Stop Detail */}
          <Stack.Screen
            name="StopDetail"
            component={StopDetailScreen}
            options={{
              headerShown: true,
              headerTitle: 'تفاصيل المحطة',
              ...detailHeaderOptions,
            }}
          />

          {/* Journey Detail */}
          <Stack.Screen
            name="JourneyDetail"
            component={JourneyDetailScreen}
            options={{
              headerShown: true,
              headerTitle: 'تفاصيل الرحلة',
              ...detailHeaderOptions,
            }}
          />

          {/* Navigation — active trip (full screen, swipe-back disabled) */}
          <Stack.Screen
            name="Navigation"
            component={NavigationScreen}
            options={{
              headerShown: false,
              animation: 'slide_from_bottom',
              gestureEnabled: false,
            }}
          />

          {/* Alerts */}
          <Stack.Screen
            name="Alerts"
            component={AlertsScreen}
            options={{
              headerShown: false,
            }}
          />

          {/* Saved Routes / Bookmarks */}
          <Stack.Screen
            name="SavedRoutes"
            component={SavedRoutesScreen}
            options={{
              headerShown: false,
            }}
          />

          {/* Community Reports */}
          <Stack.Screen
            name="Community"
            component={CommunityScreen}
            options={{
              headerShown: false,
            }}
          />

          {/* Auth — modal */}
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{
              presentation: 'modal',
              animation: 'slide_from_bottom',
              headerShown: false,
            }}
          />

          {/* Full Map View */}
          <Stack.Screen
            name="Map"
            component={MapScreen}
            options={{
              headerShown: false,
            }}
          />
        </Stack.Navigator>

        {/* Active trip banner — overlays content when navigating */}
        <ActiveTripBanner />
      </NavigationContainer>
    </ActiveTripProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tripBanner: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: 80,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand_blue,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.pill,
    gap: spacing[2],
    ...shadows.lg,
    zIndex: 100,
  },
  tripBannerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  tripBannerLabel: {
    flex: 1,
    fontFamily: 'IBM Plex Sans Arabic',
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.white,
  },
  tripBannerClose: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tripBannerCloseText: {
    fontSize: 12,
    color: colors.white,
    fontWeight: fontWeight.bold,
  },
});
