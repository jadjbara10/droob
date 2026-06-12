// ============================================================================
// دروب (Droob) — App Navigation (Guest-first, 4 tabs, i18n-ready)
// Flow: Onboarding (once) → MainTabs (Home, Planner, Routes, Profile)
// Stack: Search, RouteDetail, StopDetail, JourneyDetail, Navigation, Auth, etc.
// ============================================================================

import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NavigationContainer, useNavigation } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useTranslation } from "react-i18next";
import { BlurView } from "expo-blur";
import Animated, { useAnimatedStyle, withSpring, useSharedValue, withSequence, withTiming } from "react-native-reanimated";
import { colors, spacing, radius, fontSize, fontWeight, shadows, animationModern, glassModern, gradients } from "@theme/tokens";
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

// ─── Tab Bar Icon Component ──────────────────────────────────────────────────

function TabIcon({ emoji, focused, isCenter }: { emoji: string; focused: boolean; isCenter?: boolean }) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(() => {
    scale.value = withSequence(
      withTiming(0.85, { duration: 80 }),
      withSpring(1, animationModern.tabBounce),
    );
  }, []);

  if (isCenter && focused) {
    return (
      <View style={tabStyles.centerIconContainer}>
        <Text style={tabStyles.centerIcon}>{emoji}</Text>
      </View>
    );
  }

  return (
    <Animated.View style={[tabStyles.iconContainer, focused && tabStyles.iconContainerActive, animatedStyle]}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>{emoji}</Text>
    </Animated.View>
  );
}

// ─── Main Tabs ────────────────────────────────────────────────────────────

function MainTabs() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand_blue,
        tabBarInactiveTintColor: "#94A3B8",
        tabBarStyle: {
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          borderTopWidth: 0,
          height: 68 + insets.bottom,
          paddingBottom: 8 + insets.bottom,
          paddingTop: 8,
          elevation: 0,
          shadowColor: "transparent",
          backgroundColor: "transparent",
        },
        tabBarBackground: () => (
          Platform.OS === "ios" ? (
            <BlurView
              tint="light"
              intensity={85}
              style={{
                ...StyleSheet.absoluteFillObject,
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                overflow: "hidden",
              }}
            />
          ) : (
            <View
              style={{
                ...StyleSheet.absoluteFillObject,
                backgroundColor: "rgba(255, 255, 255, 0.95)",
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
              }}
            />
          )
        ),
        tabBarLabelStyle: {
          fontFamily: "IBM Plex Sans Arabic",
          fontSize: 11,
          fontWeight: fontWeight.semiBold,
          marginTop: -2,
        },
      }}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{
        tabBarLabel: t("nav.map"),
        tabBarIcon: ({ focused }: { focused: boolean; color: string; size: number }) => (
          <TabIcon emoji="🗺️" focused={focused} />
        ),
      }} />
      <Tab.Screen name="TripPlanner" component={TripPlannerScreen} options={{
        tabBarLabel: t("nav.planner"),
        tabBarIcon: ({ focused }: { focused: boolean; color: string; size: number }) => (
          <TabIcon emoji="🧭" focused={focused} isCenter />
        ),
      }} />
      <Tab.Screen name="Routes" component={RoutesScreen} options={{
        tabBarLabel: t("nav.routes"),
        tabBarIcon: ({ focused }: { focused: boolean; color: string; size: number }) => (
          <TabIcon emoji="🛣️" focused={focused} />
        ),
      }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{
        tabBarLabel: t("nav.profile"),
        tabBarIcon: ({ focused }: { focused: boolean; color: string; size: number }) => (
          <TabIcon emoji="👤" focused={focused} />
        ),
      }} />
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

const tabStyles = StyleSheet.create({
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainerActive: {
    backgroundColor: "rgba(26, 79, 138, 0.1)",
  },
  icon: {
    fontSize: 20,
  },
  iconActive: {
    fontSize: 22,
  },
  centerIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.brand_blue,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -20,
    shadowColor: colors.brand_blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  centerIcon: {
    fontSize: 24,
  },
});
