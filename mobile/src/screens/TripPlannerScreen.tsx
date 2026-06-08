// ============================================================================
// دروب (Droob) — TripPlannerScreen
// Core journey-planning screen: origin/dest, time + mode + preference filters,
// journey cards with MAP ROUTE VISUALIZATION (colored polylines).
// Uber/Careem quality, RTL Arabic throughout.
// ============================================================================
import { useInterstitialAd } from "@components/AdInterstitial";
import { useRewardedAd } from "@components/AdRewarded";
import { AD_INTERSTITIAL_TRIP, AD_REWARDED_EXTRA_TRIPS, MAX_FREE_TRIPS_PER_DAY } from "@config/ads";
// ============================================================================

import React, { useState, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Dimensions,
  type ListRenderItemInfo,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import Animated, {
  FadeInDown,
  FadeOutUp,
  Layout,
} from "react-native-reanimated";
import {
  colors,
  transitColorMap,
  radius,
  spacing,
  fontSize,
  fontWeight,
  shadows,
  layout as lo,
} from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { Journey as CanonicalJourney } from "@/types/transit.types";
import { JourneyCard } from "@components/JourneyCard";
import { TransitBadge } from "@components/TransitBadge";
import { ErrorBoundary } from "@components/ErrorBoundary";
import LeafletMap from "@components/LeafletMap";
import { useTransitStore } from "@stores/transit.store";
import { useAppStore } from "@stores/app.store";
import { canonicalJourneyToDisplay } from "@/services/api";
import { analytics } from "@/services/analytics";
import type { Journey, TransitStop } from "@/types/transit";
import {
  transportConfig,
  TRIP_FILTERS,
  TIME_OPTIONS,
} from "@config/transport.config";
import { MODE_PATH_COLOR, WALKING_DASH } from "@config/route-paths";
import * as Location from "expo-location";

const { width: SW } = Dimensions.get("window");

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate fallback straight-line path between two stops when leg.polyline is unavailable */
function generateFallbackCoords(leg: Journey["legs"][0]): Array<[number, number]> {
  if (leg.fromStop && leg.toStop) {
    return [[leg.fromStop.lat, leg.fromStop.lng], [leg.toStop.lat, leg.toStop.lng]];
  }
  return [[31.9600, 35.9100], [31.9550, 35.9300]];
}

// ─── Constants ───────────────────────────────────────────────────────────────

type TimeKey = (typeof TIME_OPTIONS)[number]["key"];
type PrefKey = (typeof TRIP_FILTERS)[number]["key"];

/** Extended filter with a "cheapest" option for the UI (not in TRIP_FILTERS). */
const PREFERENCE_OPTIONS: {
  key: PrefKey | "cheapest";
  label_ar: string;
  icon: string;
}[] = [
  ...TRIP_FILTERS.map((f) => ({ key: f.key, label_ar: f.label_ar, icon: f.icon })),
  { key: "cheapest" as const, label_ar: "الأرخص", icon: "💰" },
];

const MODE_FILTERS: { key: TransitMode | "all"; label_ar: string; icon: string }[] = [
  { key: "all", label_ar: "الكل", icon: "🌐" },
  { key: "city_bus", label_ar: "باص", icon: "🚌" },
  { key: "brt", label_ar: "BRT", icon: "⚡" },
  { key: "serveece", label_ar: "سرفيس", icon: "🚐" },
  { key: "intercity", label_ar: "خطوط", icon: "🚍" },
];

// ─── Supporting Components ───────────────────────────────────────────────────

/** Location Fields with colored dots, swap, and placeholders. */
const LocationFields: React.FC<{
  from: string;
  to: string;
  onSwap: () => void;
  onFromPress: () => void;
  onToPress: () => void;
}> = ({ from, to, onSwap, onFromPress, onToPress }) => (
  <View style={styles.locationWrap}>
    {/* FROM */}
    <View style={styles.locRow}>
      <View style={[styles.locDot, { backgroundColor: colors.on_time }]} />
      <TouchableOpacity
        style={styles.locField}
        onPress={onFromPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`نقطة الانطلاق: ${from || "غير محدد"}`}
      >
        <View style={styles.locFieldInner}>
          <Text style={styles.locLabel}>من أين؟</Text>
          <Text
            style={[styles.locText, !from && styles.locPlaceholder]}
            numberOfLines={1}
          >
            {from || "موقعي الحالي"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>

    {/* SWAP */}
    <View style={styles.locConnector}>
      <View style={styles.locLine} />
      <TouchableOpacity
        style={styles.swapBtn}
        onPress={onSwap}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="تبديل الوجهة ونقطة الانطلاق"
      >
        <Text style={styles.swapIcon}>⇅</Text>
      </TouchableOpacity>
      <View style={styles.locLine} />
    </View>

    {/* TO */}
    <View style={styles.locRow}>
      <View style={[styles.locDot, { backgroundColor: colors.cancelled }]} />
      <TouchableOpacity
        style={styles.locField}
        onPress={onToPress}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`الوجهة: ${to || "غير محدد"}`}
      >
        <View style={styles.locFieldInner}>
          <Text style={styles.locLabel}>إلى أين؟</Text>
          <Text
            style={[styles.locText, !to && styles.locPlaceholder]}
            numberOfLines={1}
          >
            {to || "اختر الوجهة"}
          </Text>
        </View>
      </TouchableOpacity>
    </View>
  </View>
);

/** Time selector pills: Now / Depart at / Arrive by. */
const TimeSelector: React.FC<{
  active: TimeKey;
  onChange: (k: TimeKey) => void;
}> = ({ active, onChange }) => (
  <View style={styles.timeRow}>
    {TIME_OPTIONS.map((opt) => {
      const isActive = active === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          style={[styles.timePill, isActive && styles.timePillActive]}
          onPress={() => onChange(opt.key)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
        >
          <Text
            style={[styles.timePillText, isActive && styles.timePillTextActive]}
          >
            {opt.label_ar}
          </Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

/** Preference filter tabs with icons. */
const PreferenceTabs: React.FC<{
  active: string;
  onChange: (k: string) => void;
}> = ({ active, onChange }) => (
  <Animated.View
    style={styles.prefRow}
    entering={FadeInDown.duration(200)}
    layout={Layout.springify()}
  >
    {PREFERENCE_OPTIONS.map((opt) => {
      const isActive = active === opt.key;
      return (
        <TouchableOpacity
          key={opt.key}
          style={[styles.prefTab, isActive && styles.prefTabActive]}
          onPress={() => onChange(opt.key)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: isActive }}
        >
          <Text style={styles.prefIcon}>{opt.icon}</Text>
          <Text
            style={[styles.prefLabel, isActive && styles.prefLabelActive]}
          >
            {opt.label_ar}
          </Text>
        </TouchableOpacity>
      );
    })}
  </Animated.View>
);

/** Mode filter chips. */
const ModeChips: React.FC<{
  selected: TransitMode[];
  onToggle: (m: TransitMode | "all") => void;
}> = ({ selected, onToggle }) => (
  <Animated.View
    style={styles.modeRow}
    entering={FadeInDown.duration(200)}
    layout={Layout.springify()}
  >
    {MODE_FILTERS.map((m) => {
      if (m.key === "all") {
        const allSelected = selected.length === 4;
        return (
          <TouchableOpacity
            key="all"
            style={[styles.modeChip, allSelected && styles.modeChipActive]}
            onPress={() => onToggle("all" as unknown as TransitMode)}
            activeOpacity={0.7}
          >
            <Text style={styles.modeChipIcon}>{m.icon}</Text>
            <Text
              style={[
                styles.modeChipLabel,
                allSelected && styles.modeChipLabelActive,
              ]}
            >
              {m.label_ar}
            </Text>
          </TouchableOpacity>
        );
      }
      const isSelected = selected.includes(m.key);
      const c = transitColorMap[m.key];
      return (
        <TouchableOpacity
          key={m.key}
          style={[
            styles.modeChip,
            isSelected && {
              borderColor: c,
              backgroundColor: c + "18",
            },
          ]}
          onPress={() => onToggle(m.key)}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityState={{ selected: isSelected }}
        >
          <Text style={styles.modeChipIcon}>{m.icon}</Text>
          <Text
            style={[
              styles.modeChipLabel,
              isSelected && { color: c },
            ]}
          >
            {m.label_ar}
          </Text>
        </TouchableOpacity>
      );
    })}
  </Animated.View>
);

/** Loading skeleton shimmer placeholders. */
const LoadingSkeleton: React.FC = () => (
  <View style={styles.skeletonWrap}>
    {[1, 2, 3].map((i) => (
      <Animated.View
        key={i}
        style={styles.skeletonCard}
        entering={FadeInDown.duration(300).delay(i * 100)}
      >
        <View style={styles.skelRow}>
          <View style={styles.skelBadge} />
          <View style={styles.skelBadge} />
        </View>
        <View style={[styles.skelBar, { width: "80%", marginTop: spacing[3] }]} />
        <View style={[styles.skelBar, { width: "60%", marginTop: spacing[1] }]} />
        <View style={styles.skelFooter}>
          <View style={[styles.skelBar, { width: "30%" }]} />
          <View style={[styles.skelBar, { width: "25%" }]} />
        </View>
      </Animated.View>
    ))}
  </View>
);

/** Error state with retry button. */
const ErrorState: React.FC<{
  message: string;
  onRetry: () => void;
}> = ({ message, onRetry }) => (
  <View style={styles.stateBox}>
    <Text style={styles.errorIcon}>⚠️</Text>
    <Text style={styles.stateTitle}>حدث خطأ</Text>
    <Text style={styles.stateSubtitle}>{message}</Text>
    <TouchableOpacity
      style={styles.retryBtn}
      onPress={onRetry}
      activeOpacity={0.8}
    >
      <Text style={styles.retryText}>إعادة المحاولة</Text>
    </TouchableOpacity>
  </View>
);

/** Empty state. */
const EmptyState: React.FC = () => (
  <View style={styles.stateBox}>
    <Text style={styles.emptyIcon}>🔍</Text>
    <Text style={styles.stateTitle}>لا توجد نتائج</Text>
    <Text style={styles.stateSubtitle}>
      لم نجد رحلات. جرب وجهة أخرى أو غير وسيلة النقل.
    </Text>
  </View>
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** User-friendly label for the number of transfers. */
const transfersLabel = (n: number): string => {
  if (n === 0) return "بدون تحويل";
  if (n === 1) return "تحويل واحد";
  return `${n} تحويلات`;
};

// ─── Main Screen ────────────────────────────────────────────────────────────

const TripPlannerScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  // ── State ──────────────────────────────────────────────────────────────
  const [fromLabel, setFromLabel] = useState("موقعي الحالي");
  const [toLabel, setToLabel] = useState("");
  const [timeKey, setTimeKey] = useState<TimeKey>("now");
  const [activePref, setActivePref] = useState<string>("fastest");
  const [selectedModes, setSelectedModes] = useState<TransitMode[]>([
    "city_bus",
    "brt",
    "serveece",
    "intercity",
  ]);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTarget, setSearchTarget] = useState<"from" | "to">("from");
  const [fromCoords, setFromCoords] = useState<[number, number] | null>([transportConfig.ammanCenter.lat, transportConfig.ammanCenter.lng]);
  const [toCoords, setToCoords] = useState<[number, number] | null>(null);

  // Ad hooks
  const interstitial = useInterstitialAd(AD_INTERSTITIAL_TRIP, "trip");
  const rewardedTrips = useRewardedAd(AD_REWARDED_EXTRA_TRIPS, "extra_trip");

  // Handle incoming coordinates from MapScreen selection
  
  // Handle incoming coordinates from MapScreen via Zustand store (reliable)
  const pendingMapCoords = useAppStore((s) => s.pendingMapCoords);
  const pendingMapTarget = useAppStore((s) => s.pendingMapTarget);
  const clearPendingMapSelection = useAppStore((s) => s.clearPendingMapSelection);

  React.useEffect(() => {
    if (pendingMapCoords && pendingMapTarget) {
      const label = `${pendingMapCoords.lat.toFixed(4)}, ${pendingMapCoords.lng.toFixed(4)}`;
      if (pendingMapTarget === "from") {
        setFromCoords([pendingMapCoords.lat, pendingMapCoords.lng]);
        setFromLabel(label);
      } else {
        setToCoords([pendingMapCoords.lat, pendingMapCoords.lng]);
        setToLabel(label);
      }
      clearPendingMapSelection();
    }
  }, [pendingMapCoords, pendingMapTarget, clearPendingMapSelection]);

  // ── Store ──────────────────────────────────────────────────────────────
  const storeJourneys = useTransitStore((s) => s.journeys);
  const planJourney = useTransitStore((s) => s.planJourney);
  const storeError = useTransitStore((s) => s.error);
  const storeLoading = useTransitStore((s) => s.isLoading);

  /** Combined display journeys: real store data transformed for UI. */
  const displayJourneys: Journey[] = useMemo(() => {
    if (storeJourneys && storeJourneys.length > 0) {
      try {
        // Transform canonical journeys (from backend/store) → display format
        return (storeJourneys as unknown as CanonicalJourney[]).map(canonicalJourneyToDisplay);
      } catch {
        return [];
      }
    }
    return []; // No mock fallback — show empty/idle state when no results
  }, [storeJourneys]);

  // Sorted by active preference
  const sortedJourneys = useMemo(() => {
    const list = [...displayJourneys];
    switch (activePref) {
      case "fastest":
        list.sort((a, b) => a.totalDurationMinutes - b.totalDurationMinutes);
        break;
      case "cheapest":
        list.sort(
          (a, b) => (a.fareAmount ?? Infinity) - (b.fareAmount ?? Infinity)
        );
        break;
      case "fewest_transfers":
        list.sort((a, b) => a.transfers - b.transfers);
        break;
      case "least_walking":
        list.sort((a, b) => a.walkingMinutes - b.walkingMinutes);
        break;
      default:
        break;
    }
    return list;
  }, [displayJourneys, activePref]);

  const filteredJourneys = useMemo(() => {
    if (selectedModes.length === 4) return sortedJourneys; // "All"
    return sortedJourneys.filter((j) =>
      j.modes && j.modes.some((m) => selectedModes.includes(m))
    );
  }, [sortedJourneys, selectedModes]);

  // ── Track analytics when journey results are shown ──────────────────────
  const prevJourneyCount = useRef(0);
  React.useEffect(() => {
    if (filteredJourneys.length > 0 && prevJourneyCount.current === 0) {
      analytics.trackTripPlan(fromLabel || 'موقعي', toLabel || 'وجهة', filteredJourneys.length);
    }
    prevJourneyCount.current = filteredJourneys.length;
  }, [filteredJourneys, fromLabel, toLabel]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSwap = useCallback(() => {
    setFromLabel((f) => {
      const n = toLabel;
      setToLabel(f);
      return n;
    });
  }, [toLabel]);

  const handleModeToggle = useCallback(
    (mode: TransitMode | "all") => {
      if (mode === "all") {
        // Toggle all on/off
        setSelectedModes((prev) =>
          prev.length === 4
            ? []
            : ["city_bus", "brt", "serveece", "intercity"]
        );
        return;
      }
      setSelectedModes((prev) =>
        prev.includes(mode)
          ? prev.filter((m) => m !== mode)
          : [...prev, mode]
      );
    },
    []
  );

  // ── Auto-search when both origin & destination are set ─────────────────
  const hasSearched = useRef(false);
  React.useEffect(() => {
    if (fromCoords && toCoords && fromLabel && toLabel && !hasSearched.current) {
      hasSearched.current = true;
      handleSearch();
    }
  }, [fromCoords, toCoords]);

  const handleSearch = useCallback(async (retryWithLargerWalk = false) => {
    if (!fromLabel || !toLabel) return;
    const fromLat = fromCoords?.[0] ?? transportConfig.ammanCenter.lat;
    const fromLng = fromCoords?.[1] ?? transportConfig.ammanCenter.lng;
    const toLat = toCoords?.[0] ?? 31.9636;
    const toLng = toCoords?.[1] ?? 35.9156;

    const maxWalk = retryWithLargerWalk ? 2000 : 1200; // Start 1200m, retry 2000m

    try {
      const journeys = await planJourney(fromLat, fromLng, toLat, toLng, {
        preferredModes: selectedModes.join(","),
        timeType: timeKey === "arrive_by" ? "arrive" : "depart",
        preference: activePref,
        maxWalkingMeters: maxWalk,
        maxTransfers: 2,
      });

      // Auto-retry with larger walking radius if no results
      if ((!journeys || journeys.length === 0) && !retryWithLargerWalk) {
        console.log('[TripPlanner] No results with 1200m walk, retrying with 2000m...');
        await handleSearch(true);
      }
    } catch {
      // Store sets error state — we render it via ErrorState
    }
  }, [fromLabel, toLabel, fromCoords, toCoords, selectedModes, timeKey, activePref, planJourney]);

  const handleCardSelect = useCallback(
    (journey: Journey) => {
      navigation.navigate("JourneyDetail", { journey });
    },
    [navigation]
  );

  const handleStartNav = useCallback(
    (journey: Journey) => {
      navigation.navigate("JourneyDetail", { journey });
    },
    [navigation]
  );

  const openSearch = useCallback((target: "from" | "to") => {
    setSearchTarget(target);
    setShowSearch(true);
  }, []);

  const selectSearchResult = useCallback(
    (stop: { nameAr: string; lat?: number; lng?: number }) => {
      if (searchTarget === "from") {
        setFromLabel(stop.nameAr);
        if (stop.lat !== undefined && stop.lng !== undefined) {
          setFromCoords([stop.lat, stop.lng]);
        }
      } else {
        setToLabel(stop.nameAr);
        if (stop.lat !== undefined && stop.lng !== undefined) {
          setToCoords([stop.lat, stop.lng]);
        }
      }
      setShowSearch(false);
    },
    [searchTarget]
  );

  // ── Render Helpers ─────────────────────────────────────────────────────
  const quickStops = useMemo(
    () => [
      { nameAr: "العبدلي", nameEn: "Abdali", code: "AMM-ABD", lat: 31.9636, lng: 35.9156 },
      { nameAr: "الجامعة الأردنية", nameEn: "UJ", code: "AMM-UJ", lat: 32.0156, lng: 35.8747 },
      { nameAr: "وسط البلد", nameEn: "Downtown", code: "AMM-BLD", lat: 31.9516, lng: 35.9397 },
      { nameAr: "مجمع الجاردنز", nameEn: "Gardens", code: "AMM-GDN", lat: 31.9856, lng: 35.8714 },
      { nameAr: "الصويلح", nameEn: "Sweileh", code: "AMM-SWL", lat: 32.0367, lng: 35.8275 },
      { nameAr: "الوحدات", nameEn: "Wahdat", code: "AMM-WHD", lat: 31.9239, lng: 35.8900 },
    ],
    []
  );

  // ── Ensure routes are loaded for path rendering ───────────────────────
  const storeRoutes = useTransitStore((s) => s.routes);
  const fetchRoutes = useTransitStore((s) => s.fetchRoutes);
  React.useEffect(() => {
    if (storeRoutes.length === 0) fetchRoutes({ limit: 500 });
  }, []);

  // ── GPS Location Tracking ──────────────────────────────────────────────
  const [userGps, setUserGps] = useState<{ lat: number; lng: number } | null>(null);
  const gpsSubscription = useRef<any>(null);

  React.useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;
        gpsSubscription.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 5000, distanceInterval: 10 },
          (loc) => {
            if (active && loc.coords) {
              setUserGps({ lat: loc.coords.latitude, lng: loc.coords.longitude });
            }
          }
        );
      } catch { /* GPS unavailable */ }
    })();
    return () => { active = false; gpsSubscription.current?.remove?.(); };
  }, []);

  // ── Map center: follow GPS if available, else journey midpoint ──────────
  const mapCenter = useMemo(() => {
    if (userGps) return { lat: userGps.lat, lng: userGps.lng };
    if (filteredJourneys.length > 0) {
      const j = filteredJourneys[0];
      const pts = j.legs.flatMap(l => l.polyline || []);
      if (pts.length > 0) {
        const avgLat = pts.reduce((s, p) => s + p[1], 0) / pts.length;
        const avgLng = pts.reduce((s, p) => s + p[0], 0) / pts.length;
        return { lat: avgLat, lng: avgLng };
      }
    }
    return { lat: 31.9600, lng: 35.9200 };
  }, [userGps, filteredJourneys]);

  // ── Compute map polylines with REAL road-matched route paths ────────────
  const journeyPolylines = useMemo(() => {
    if (filteredJourneys.length === 0) return [];
    const j = filteredJourneys[0];
    return j.legs.map((leg: any, i: number) => {
      const mode = leg.mode || leg.type === "walk" ? "walking" : (leg.mode || "city_bus");
      let coords: Array<[number, number]> = [];

      // Backend returns: leg.from / leg.to (NOT fromStop/toStop)
      const fromObj = leg.from || leg.fromStop;
      const toObj = leg.to || leg.toStop;

      // For transit legs: use FULL stored route path_geojson for road accuracy
      if (leg.type === "transit" && leg.routeCode && storeRoutes.length > 0) {
        const matchedRoute = (storeRoutes as any[]).find(
          (r: any) => r.code === leg.routeCode || r.code === leg.routeCode?.replace(/_/g, "-")
        );
        if (matchedRoute?.path_geojson) {
          let pg = matchedRoute.path_geojson;
          if (typeof pg === "string") { try { pg = JSON.parse(pg); } catch { pg = null; } }
          if (pg?.type === "LineString" && Array.isArray(pg.coordinates)) {
            const allCoords = pg.coordinates as Array<[number, number]>; // [lng, lat]
            const fromLat = fromObj?.lat;
            const fromLng = fromObj?.lng;
            const toLat = toObj?.lat;
            const toLng = toObj?.lng;

            if (fromLat != null && toLat != null) {
              let bestFrom = 0, bestTo = allCoords.length - 1;
              let minFrom = Infinity, minTo = Infinity;
              for (let ci = 0; ci < allCoords.length; ci++) {
                const dFrom = Math.hypot(allCoords[ci][1] - fromLat, allCoords[ci][0] - fromLng);
                const dTo = Math.hypot(allCoords[ci][1] - toLat, allCoords[ci][0] - toLng);
                if (dFrom < minFrom) { minFrom = dFrom; bestFrom = ci; }
                if (dTo < minTo) { minTo = dTo; bestTo = ci; }
              }
              const lo = Math.min(bestFrom, bestTo);
              const hi = Math.max(bestFrom, bestTo);
              // Convert [lng,lat] → [lat,lng] for Leaflet
              coords = allCoords.slice(lo, hi + 1).map(([lng, lat]) => [lat, lng] as [number, number]);
            }
          }
        }
      }

      // Fallback: use polyline from API response
      if (coords.length === 0) {
        if (leg.polyline && leg.polyline.length > 2) {
          // API polyline is [lng,lat] → convert to [lat,lng]
          coords = leg.polyline.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
        } else if (fromObj && toObj) {
          coords = [[fromObj.lat, fromObj.lng], [toObj.lat, toObj.lng]];
        } else {
          coords = generateFallbackCoords(leg as any);
        }
      }

      return {
        id: `leg-${i}-${mode}`,
        coords,
        color: MODE_PATH_COLOR[mode] || "#999",
        weight: leg.type === "walk" ? 3 : 5,
        opacity: leg.type === "walk" ? 0.7 : 0.9,
        dashArray: leg.type === "walk" ? WALKING_DASH : "",
      };
    });
  }, [filteredJourneys, storeRoutes]);

  const journeyMarkers = useMemo(() => {
    if (filteredJourneys.length === 0) return [];
    const j = filteredJourneys[0];
    const markers: Array<{ id: string; lat: number; lng: number; label: string; color: string }> = [];
    // GPS user location
    if (userGps) {
      markers.push({ id: "user-gps", lat: userGps.lat, lng: userGps.lng, label: "📍 موقعي", color: "#1A4F8A" });
    }
    // Origin — backend sends leg.from, frontend may have leg.fromStop
    const firstFrom = j.legs[0]?.from || (j.legs[0] as any)?.fromStop;
    if (firstFrom?.lat) {
      markers.push({ id: "origin", lat: firstFrom.lat, lng: firstFrom.lng, label: "🚩 الانطلاق", color: "#16A34A" });
    }
    // Transfer points
    j.legs.forEach((leg: any, i: number) => {
      const legTo = leg.to || leg.toStop;
      if (legTo?.lat && i < j.legs.length - 1) {
        markers.push({ id: `xfer-${i}`, lat: legTo.lat, lng: legTo.lng, label: `🔄 ${legTo.nameAr || legTo.name_ar || ""}`, color: "#1A4F8A" });
      }
    });
    // Destination
    const lastTo = j.legs[j.legs.length - 1]?.to || (j.legs[j.legs.length - 1] as any)?.toStop;
    if (lastTo?.lat) {
      markers.push({ id: "dest", lat: lastTo.lat, lng: lastTo.lng, label: "🏁 الوصول", color: "#DC2626" });
    }
    return markers;
  }, [filteredJourneys, userGps]);

  const renderJourneyItem = useCallback(
    ({ item }: ListRenderItemInfo<Journey>) => (
      <Animated.View
        entering={FadeInDown.duration(350).springify()}
        exiting={FadeOutUp.duration(200)}
        layout={Layout.springify()}
      >
        <JourneyCard
          journey={item}
          onSelect={handleCardSelect}
          onStartNavigation={handleStartNav}
        />
      </Animated.View>
    ),
    [handleCardSelect, handleStartNav]
  );

  /** Whether both fields are empty — show the idle design instead of results. */
  const hasQuery = fromLabel.length > 0 || toLabel.length > 0;
  const showResults = hasQuery && filteredJourneys.length > 0;
  const showEmpty = hasQuery && filteredJourneys.length === 0 && !storeLoading;
  const showError = hasQuery && !!storeError && !storeLoading && filteredJourneys.length === 0;

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* ── Header ──────────────────────────────────────────────────── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="رجوع"
          >
            <Text style={styles.backArrow}>→</Text>
          </TouchableOpacity>
          <Text style={styles.title}>تخطيط الرحلة</Text>
          <View style={styles.headerSpacer} />
        </View>

        {/* ── Location Fields ──────────────────────────────────────────── */}
        <LocationFields
          from={fromLabel}
          to={toLabel}
          onSwap={handleSwap}
          onFromPress={() => openSearch("from")}
          onToPress={() => openSearch("to")}
        />

        {/* ── Time Selector ────────────────────────────────────────────── */}
        <TimeSelector active={timeKey} onChange={setTimeKey} />

        {/* ── Preference Tabs ──────────────────────────────────────────── */}
        <PreferenceTabs active={activePref} onChange={setActivePref} />

        {/* ── Mode Chips ───────────────────────────────────────────────── */}
        <ModeChips selected={selectedModes} onToggle={handleModeToggle} />

        {/* ── Divider ─────────────────────────────────────────────────── */}
        {hasQuery && <View style={styles.divider} />}

        {/* ── Route Map (shows REAL road-matched paths + GPS tracking) ── */}
        {showResults && (
          <View style={styles.mapSection}>
            <ErrorBoundary fallback={<View style={styles.mapPlaceholder} />}>
              <LeafletMap
                style={styles.journeyMap}
                centerLat={mapCenter.lat}
                centerLng={mapCenter.lng}
                zoom={14}
                markers={journeyMarkers}
                polylines={journeyPolylines}
              />
            </ErrorBoundary>
            {/* Map legend */}
            <View style={styles.mapLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: MODE_PATH_COLOR.walking }]} /><Text style={styles.legendLabel}>مشي</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: MODE_PATH_COLOR.brt }]} /><Text style={styles.legendLabel}>BRT</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: MODE_PATH_COLOR.city_bus }]} /><Text style={styles.legendLabel}>باص</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: MODE_PATH_COLOR.serveece }]} /><Text style={styles.legendLabel}>سرفيس</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: MODE_PATH_COLOR.intercity }]} /><Text style={styles.legendLabel}>بين مدن</Text></View>
            </View>
          </View>
        )}

        {/* ── Results Area ─────────────────────────────────────────────── */}
        {!hasQuery ? (
          /* Idle state — show prompt */
          <View style={styles.stateBox}>
            <Text style={styles.idleIcon}>🧭</Text>
            <Text style={styles.stateTitle}>أين تريد الذهاب؟</Text>
            <Text style={styles.stateSubtitle}>
              أدخل وجهتك للبحث عن أفضل الرحلات المتاحة.
            </Text>
          </View>
        ) : storeLoading ? (
          <LoadingSkeleton />
        ) : showError ? (
          <ErrorState
            message={storeError || "حدث خطأ غير متوقع"}
            onRetry={handleSearch}
          />
        ) : showEmpty ? (
          <EmptyState />
        ) : showResults ? (
          <FlatList
            data={filteredJourneys}
            keyExtractor={(j) => j.id}
            contentContainerStyle={styles.listContent}
            renderItem={renderJourneyItem}
            ListHeaderComponent={
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsCount}>
                  {filteredJourneys.length} رحلة متاحة
                </Text>
                <TouchableOpacity
                  style={styles.sortBtn}
                  activeOpacity={0.7}
                  onPress={handleSearch}
                >
                  <Text style={styles.sortBtnText}>تحديث</Text>
                </TouchableOpacity>
              </View>
            }
            showsVerticalScrollIndicator={false}
          />
        ) : null}

        {/* ── Search Bottom Sheet ──────────────────────────────────────── */}
        {showSearch && (
          <Animated.View
            style={[styles.searchOverlay]}
            entering={FadeInDown.duration(250)}
          >
            <TouchableOpacity
              style={styles.overlayBackdrop}
              onPress={() => setShowSearch(false)}
              activeOpacity={1}
            />
            <Animated.View
              style={styles.searchSheet}
              entering={FadeInDown.duration(300).springify()}
            >
              {/* Handle */}
              <View style={styles.sheetHandle} />

              <Text style={styles.sheetTitle}>
                {searchTarget === "from" ? "نقطة الانطلاق" : "الوجهة"}
              </Text>

              {/* Search Input */}
              <View style={styles.searchInputWrap}>
                <Text style={styles.searchInputIcon}>
                  {searchTarget === "from" ? "🟢" : "🔴"}
                </Text>
                <TextInput
                  style={styles.searchInput}
                  placeholder={
                    searchTarget === "from"
                      ? "ابحث عن محطة انطلاق..."
                      : "ابحث عن وجهة..."
                  }
                  placeholderTextColor={colors.text_tertiary}
                  textAlign="right"
                  autoFocus
                  accessibilityRole="search"
                />
              </View>

              {/* Current Location */}
              <TouchableOpacity
                style={styles.currentLocBtn}
                onPress={() => {
                  const loc = useTransitStore.getState().userLocation;
                  if (searchTarget === "from") {
                    setFromLabel("موقعي الحالي");
                    setFromCoords(loc ? [loc.lat, loc.lng] : [transportConfig.ammanCenter.lat, transportConfig.ammanCenter.lng]);
                  } else {
                    setToLabel("موقعي الحالي");
                    setToCoords(loc ? [loc.lat, loc.lng] : [transportConfig.ammanCenter.lat, transportConfig.ammanCenter.lng]);
                  }
                  setShowSearch(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.currentLocDot} />
                <Text style={styles.currentLocText}>موقعي الحالي</Text>
              </TouchableOpacity>

              {/* Select on Map */}
              <TouchableOpacity
                style={styles.selectOnMapBtn}
                onPress={() => {
                  setShowSearch(false);
                  navigation.navigate("Map", {
                    selectionMode: true,
                    selectionTarget: searchTarget,
                  });
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.selectOnMapIcon}>🗺️</Text>
                <Text style={styles.selectOnMapText}>تحديد على الخارطة</Text>
              </TouchableOpacity>

              {/* Quick Stops */}
              <Text style={styles.quickTitle}>محطات سريعة</Text>
              <FlatList
                data={quickStops}
                keyExtractor={(s) => s.code}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.quickItem}
                    onPress={() => selectSearchResult(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.quickItemDot} />
                    <View style={styles.quickItemInfo}>
                      <Text style={styles.quickItemName}>{item.nameAr}</Text>
                      <Text style={styles.quickItemNameEn}>{item.nameEn}</Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </Animated.View>
          </Animated.View>
        )}
      </View>
    </ErrorBoundary>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Layout
  root: {
    flex: 1,
    backgroundColor: colors.surface_2,
  },
  // Map section
  mapSection: {
    height: 260,
    marginHorizontal: spacing[4],
    borderRadius: radius.lg,
    overflow: "hidden",
    marginBottom: spacing[2],
  },
  journeyMap: {
    ...StyleSheet.absoluteFillObject,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: colors.surface_3,
    alignItems: "center",
    justifyContent: "center",
  },
  mapLegend: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: radius.md,
    padding: spacing[2],
    gap: 4,
    ...shadows.sm,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 12,
    height: 4,
    borderRadius: 2,
  },
  legendLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.text_secondary,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    height: lo.headerHeight,
  },
  backBtn: {
    width: lo.touchTarget,
    height: lo.touchTarget,
    borderRadius: radius.full,
    backgroundColor: colors.surface_3,
    alignItems: "center",
    justifyContent: "center",
  },
  backArrow: {
    fontSize: fontSize[20],
    color: colors.text_primary,
  },
  title: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[20],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    textAlign: "center",
    flex: 1,
  },
  headerSpacer: {
    width: lo.touchTarget,
  },

  // Location Fields
  locationWrap: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  locRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  locDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing[2],
  },
  locField: {
    flex: 1,
    height: 56,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    ...shadows.sm,
  },
  locFieldInner: {
    flexDirection: "column",
  },
  locLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    fontWeight: fontWeight.medium,
    color: colors.text_tertiary,
    marginBottom: 2,
  },
  locText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.semiBold,
    color: colors.text_primary,
    textAlign: "right",
  },
  locPlaceholder: {
    color: colors.text_tertiary,
    fontWeight: fontWeight.regular,
  },
  locConnector: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
    height: 32,
  },
  locLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    borderStyle: "dashed",
  },
  swapBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  swapIcon: {
    fontSize: 16,
    color: colors.brand_blue,
  },

  // Time Selector
  timeRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  timePill: {
    flex: 1,
    height: lo.chipHeight,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  timePillActive: {
    backgroundColor: colors.brand_blue,
    borderColor: colors.brand_blue,
  },
  timePillText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.medium,
    color: colors.text_secondary,
  },
  timePillTextActive: {
    color: colors.white,
    fontWeight: fontWeight.semiBold,
  },

  // Preference Tabs
  prefRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  prefTab: {
    flexDirection: "row",
    alignItems: "center",
    height: lo.filterPillHeight,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  prefTabActive: {
    backgroundColor: colors.brand_blue + "12",
    borderColor: colors.brand_blue,
  },
  prefIcon: {
    fontSize: 12,
  },
  prefLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    fontWeight: fontWeight.medium,
    color: colors.text_secondary,
  },
  prefLabelActive: {
    color: colors.brand_blue,
    fontWeight: fontWeight.semiBold,
  },

  // Mode Chips
  modeRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[4],
    flexWrap: "wrap",
  },
  modeChip: {
    flexDirection: "row",
    alignItems: "center",
    height: lo.filterPillHeight,
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    gap: 4,
  },
  modeChipActive: {
    borderColor: colors.brand_blue,
    backgroundColor: colors.brand_blue + "12",
  },
  modeChipIcon: {
    fontSize: 13,
  },
  modeChipLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    fontWeight: fontWeight.semiBold,
    color: colors.text_secondary,
  },
  modeChipLabelActive: {
    color: colors.brand_blue,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
  },

  // Results
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: spacing[3],
  },
  resultsCount: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.semiBold,
    color: colors.text_secondary,
  },
  sortBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.pill,
    backgroundColor: colors.brand_blue + "12",
  },
  sortBtnText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.semiBold,
    color: colors.brand_blue,
  },
  listContent: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
  },

  // State Boxes (idle, empty, error)
  stateBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing[10],
    paddingBottom: spacing[16],
  },
  idleIcon: {
    fontSize: 56,
    marginBottom: spacing[4],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  stateTitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[20],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  stateSubtitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    color: colors.text_secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing[6],
    paddingHorizontal: spacing[4],
  },
  retryBtn: {
    backgroundColor: colors.brand_blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
  },
  retryText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // Loading Skeleton
  skeletonWrap: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  skeletonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  skelRow: {
    flexDirection: "row",
    gap: spacing[2],
  },
  skelBadge: {
    width: 48,
    height: 28,
    borderRadius: radius.lg,
    backgroundColor: colors.surface_3,
  },
  skelBar: {
    height: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surface_3,
  },
  skelFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  // Search Overlay
  searchOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  searchSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    maxHeight: "80%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.bottomSheet,
    borderTopRightRadius: radius.bottomSheet,
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[10],
    ...shadows.lg,
  },
  sheetHandle: {
    width: lo.bottomSheetHandleWidth,
    height: lo.bottomSheetHandleHeight,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginTop: spacing[2],
    marginBottom: spacing[3],
  },
  sheetTitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[18],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    textAlign: "center",
    marginBottom: spacing[4],
  },
  searchInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    height: lo.searchBarHeight,
    backgroundColor: colors.surface_2,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  searchInputIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[16],
    color: colors.text_primary,
    height: "100%",
    paddingVertical: 0,
  },
  currentLocBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    backgroundColor: colors.brand_blue + "08",
    borderRadius: radius.card,
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  currentLocDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.on_time,
  },
  currentLocText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.brand_blue,
  },
  selectOnMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    backgroundColor: colors.brand_blue + "08",
    borderRadius: radius.card,
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  selectOnMapIcon: { fontSize: 20 },
  selectOnMapText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.brand_blue,
  },
  quickTitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.text_secondary,
    marginBottom: spacing[2],
  },
  quickItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  quickItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text_tertiary,
  },
  quickItemInfo: {
    flex: 1,
  },
  quickItemName: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.medium,
    color: colors.text_primary,
    textAlign: "right",
  },
  quickItemNameEn: {
    fontFamily: "IBM Plex Sans",
    fontSize: fontSize[11],
    color: colors.text_tertiary,
    textAlign: "right",
  },
});

export default TripPlannerScreen;
