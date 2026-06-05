// ============================================================================
// دروب (Droob) — App Navigation (Guest-first, 4 tabs, i18n-ready)
// Flow: Onboarding (once) → MainTabs (Home, Planner, Routes, Profile)
// Stack: Search, RouteDetail, StopDetail, JourneyDetail, Navigation, Auth, etc.
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { colors, spacing, radius, fontSize, fontWeight, shadows } from "@theme/tokens";
import { useAppStore } from "@stores/app.store";
import linkingConfig from "./linking";
import type { Journey } from "../types/transit.types";

// Screens
import OnboardingScreen from "../screens/OnboardingScreen";
import HomeScreen from "../screens/HomeScreen";
import TripPlannerScreen from "../screens/TripPlannerScreen";
import DeparturesScreen from "../screens/DeparturesScreen";
import RoutesScreen from "../screens/RoutesScreen";
import ProfileScreen from "../screens/ProfileScreen";
import SearchScreen from "../screens/SearchScreen";
import RouteDetailScreen from "../screens/RouteDetailScreen";
import StopDetailScreen from "../screens/StopDetailScreen";
import JourneyDetailScreen from "../screens/JourneyDetailScreen";
import NavigationScreen from "../screens/NavigationScreen";
import AlertsScreen from "../screens/AlertsScreen";
import SavedRoutesScreen from "../screens/SavedRoutesScreen";
import CommunityScreen from "../screens/CommunityScreen";
import AuthScreen from "../screens/AuthScreen";
import MapScreen from "../screens/MapScreen";

// ─── Param Lists ──────────────────────────────────────────────────────────

export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  Search: { mode?: "origin" | "destination" | "general" };
  RouteDetail: { routeId: string; routeName?: string };
  StopDetail: { stopId: string; stopName: string };
  JourneyDetail: { journeyId?: string; journey?: Journey };
  Navigation: undefined;
  Alerts: undefined;
  SavedRoutes: undefined;
  Community: { prefillType?: string; routeId?: string; stopId?: string } | undefined;
  Auth: undefined;
  Map: { selectionMode?: boolean; selectionTarget?: "from" | "to" } | undefined;
};

export type MainTabParamList = {
  Home: undefined;
  TripPlanner: undefined;
  Routes: { routeId?: string } | undefined;
  Profile: undefined;
  Departures: { stopId?: string; stopName?: string } | undefined;
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
  tripLabel: "",
  setTripLabel: () => {},
});

export const useActiveTrip = () => useContext(ActiveTripContext);

function ActiveTripProvider({ children }: { children: React.ReactNode }) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [tripLabel, setTripLabel] = useState("");
  const startNavigation = useCallback(() => setIsNavigating(true), []);
  const stopNavigation = useCallback(() => {
    setIsNavigating(false);
    setTripLabel("");
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
      onPress={() => navigation.navigate("Navigation")}
      accessibilityRole="button"
      accessibilityLabel={tripLabel ? `Active trip to ${tripLabel}` : "Active trip — tap to return"}
    >
      <View style={styles.tripBannerDot} />
      <Text style={styles.tripBannerLabel} numberOfLines={1}>
        {tripLabel ? `🧭 ${tripLabel}` : "🧭 Active Trip"}
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

// ─── Main Tabs ────────────────────────────────────────────────────────────

function MainTabs() {
  const { t } = useTranslation();

  return (
    <Tab.Navigator
      screenOptions={{
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
          fontFamily: "IBM Plex Sans Arabic",
          fontSize: 11,
          fontWeight: fontWeight.bold,
        },
        tabBarIcon: ({ focused }: { focused: boolean; color: string; size: number }) => {
          const icons: Record<string, string> = {
            Home: "🗺️", TripPlanner: "🧭", Routes: "🛣️", Profile: "👤",
          };
          return (
            <Text style={{ fontSize: focused ? 22 : 18 }}>
              {icons[route.name] ?? "📍"}
            </Text>
          );
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: t("nav.map") }} />
      <Tab.Screen name="TripPlanner" component={TripPlannerScreen} options={{ tabBarLabel: t("nav.planner") }} />
      <Tab.Screen name="Routes" component={RoutesScreen} options={{ tabBarLabel: t("nav.routes") }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: t("nav.profile") }} />
    </Tab.Navigator>
  );
}

// ─── Default detail header options ────────────────────────────────────────

const detailHeaderOptions = {
  headerStyle: { backgroundColor: colors.surface },
  headerTintColor: colors.brand_blue,
  headerTitleStyle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[16],
    fontWeight: fontWeight.semiBold as any,
    color: colors.text_primary,
  },
  headerBackTitle: "Back" as string | undefined,
};

// ═══════════════════════════════════════════════════════════════════════════
//  AppNavigator
// ═══════════════════════════════════════════════════════════════════════════

export default function AppNavigator() {
  const isOnboarded = useAppStore((s) => s.isOnboarded);

  return (
    <ActiveTripProvider>
      <NavigationContainer linking={linkingConfig}>
        <Stack.Navigator
          screenOptions={{ headerShown: false, animation: "slide_from_right" }}
          initialRouteName={isOnboarded ? "MainTabs" : "Onboarding"}
        >
          {/* Onboarding — entry flow (shown once) */}
          <Stack.Screen name="Onboarding">
            {(props) => (
              <OnboardingScreen
                onComplete={() => (props.navigation as any).replace("MainTabs")}
                onLogin={() => (props.navigation as any).navigate("Auth")}
              />
            )}
          </Stack.Screen>

          {/* Main Tabs (4 tabs) */}
          <Stack.Screen name="MainTabs" component={MainTabs} />

          {/* Search — modal */}
          <Stack.Screen
            name="Search"
            component={SearchScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom" }}
          />

          {/* Route Detail */}
          <Stack.Screen
            name="RouteDetail"
            component={RouteDetailScreen}
            options={{ headerShown: true, headerTitle: "Route Details", ...detailHeaderOptions }}
          />

          {/* Stop Detail */}
          <Stack.Screen
            name="StopDetail"
            component={StopDetailScreen}
            options={{ headerShown: true, headerTitle: "Stop Details", ...detailHeaderOptions }}
          />

          {/* Journey Detail */}
          <Stack.Screen
            name="JourneyDetail"
            component={JourneyDetailScreen}
            options={{ headerShown: true, headerTitle: "Journey Details", ...detailHeaderOptions }}
          />

          {/* Navigation — active trip */}
          <Stack.Screen
            name="Navigation"
            component={NavigationScreen}
            options={{ headerShown: false, animation: "slide_from_bottom", gestureEnabled: false }}
          />

          {/* Alerts */}
          <Stack.Screen name="Alerts" component={AlertsScreen} options={{ headerShown: false }} />

          {/* Saved Routes */}
          <Stack.Screen name="SavedRoutes" component={SavedRoutesScreen} options={{ headerShown: false }} />

          {/* Community Reports */}
          <Stack.Screen name="Community" component={CommunityScreen} options={{ headerShown: false }} />

          {/* Auth — modal */}
          <Stack.Screen
            name="Auth"
            component={AuthScreen}
            options={{ presentation: "modal", animation: "slide_from_bottom", headerShown: false }}
          />

          {/* Full Map View */}
          <Stack.Screen name="Map" component={MapScreen} options={{ headerShown: false }} />
        </Stack.Navigator>

        <ActiveTripBanner />
      </NavigationContainer>
    </ActiveTripProvider>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tripBanner: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    bottom: 80,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brand_blue,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.pill,
    gap: spacing[2],
    ...shadows.lg,
    zIndex: 100,
  },
  tripBannerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#4ADE80" },
  tripBannerLabel: {
    flex: 1,
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.white,
  },
  tripBannerClose: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center", justifyContent: "center",
  },
  tripBannerCloseText: { fontSize: 12, color: colors.white, fontWeight: fontWeight.bold },
});
