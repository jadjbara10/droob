// ============================================================================
// دروب (Droob) — TripPlannerScreen
// Core journey-planning screen: origin/dest, time + mode + preference filters,
// journey cards with MAP ROUTE VISUALIZATION (colored polylines).
// Uber/Careem quality, RTL Arabic throughout.
// ============================================================================

import React, { useState, useCallback, useMemo } from "react";
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
import { useNavigation } from "@react-navigation/native";
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
import type { Journey, TransitStop } from "@/types/transit";
import { JourneyCard } from "@components/JourneyCard";
import { TransitBadge } from "@components/TransitBadge";
import { ErrorBoundary } from "@components/ErrorBoundary";
import LeafletMap from "@components/LeafletMap";
import { useTransitStore } from "@stores/transit.store";
import {
  transportConfig,
  TRIP_FILTERS,
  TIME_OPTIONS,
} from "@config/transport.config";
import { MODE_PATH_COLOR, WALKING_DASH } from "@config/route-paths";

const { width: SW } = Dimensions.get("window");

// ─── Route Coordinate Data (real Amman paths) ──────────────────────────────

const LEG_COORDS = {
  // Walking from user location (near Gardens) to Gardens BRT station
  walk_user_to_gardens: [[35.9100, 31.9550], [35.9090, 31.9560], [35.9080, 31.9570], [35.9070, 31.9580], [35.9060, 31.9590], [35.9050, 31.9600], [35.9040, 31.9610]] as [number, number][],
  // BRT from Gardens to Sports City
  brt_gardens_to_sportscity: [[35.9040, 31.9610], [35.9020, 31.9630], [35.9000, 31.9650], [35.8980, 31.9670], [35.8960, 31.9690], [35.8940, 31.9710], [35.8920, 31.9730], [35.8900, 31.9750], [35.8880, 31.9770], [35.8860, 31.9790], [35.8840, 31.9810], [35.8820, 31.9830], [35.8800, 31.9850]] as [number, number][],
  // Walking from Sports City to stadium entrance
  walk_sportscity_to_stadium: [[35.8800, 31.9850], [35.8810, 31.9860], [35.8820, 31.9870], [35.8830, 31.9880], [35.8840, 31.9890]] as [number, number][],
  // Direct city bus from Gardens to Downtown
  bus_gardens_to_downtown: [[35.9040, 31.9610], [35.9020, 31.9600], [35.9000, 31.9590], [35.8980, 31.9580], [35.8960, 31.9570], [35.8940, 31.9560], [35.8920, 31.9550], [35.8900, 31.9540], [35.8880, 31.9530], [35.8860, 31.9520], [35.9350, 31.9516]] as [number, number][],
  // Serveece from Abdoun to Sweifieh
  serv_abdoun_to_sweifieh: [[35.8900, 31.9590], [35.8890, 31.9610], [35.8880, 31.9630], [35.8870, 31.9650], [35.8860, 31.9670], [35.8850, 31.9690], [35.8840, 31.9710], [35.8830, 31.9730], [35.8820, 31.9750], [35.8810, 31.9770]] as [number, number][],
  // Walking from Sweifieh serveece stop to final destination
  walk_sweifieh_to_dest: [[35.8810, 31.9770], [35.8800, 31.9780], [35.8790, 31.9790]] as [number, number][],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Generate fallback straight-line path between two stops when leg.pathCoords unavailable */
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

// ─── Mock Stops ──────────────────────────────────────────────────────────────

const MOCK_STOPS = {
  user: {
    id: "u1",
    nameAr: "موقعي الحالي",
    nameEn: "My Location",
    code: "YOU",
    lat: transportConfig.ammanCenter.lat + 0.005,
    lng: transportConfig.ammanCenter.lng - 0.01,
    modes: [] as TransitMode[],
    isLandmark: false,
    isAccessible: true,
  },
  abdali: {
    id: "abd",
    nameAr: "العبدلي",
    nameEn: "Abdali",
    code: "AMM-ABD",
    lat: 31.9636,
    lng: 35.9156,
    modes: ["city_bus", "brt", "serveece"] as TransitMode[],
    isLandmark: true,
    isAccessible: true,
  },
  gardens: {
    id: "gdn",
    nameAr: "مجمع الجاردنز",
    nameEn: "Gardens Complex",
    code: "AMM-GDN",
    lat: 31.9856,
    lng: 35.8714,
    modes: ["city_bus", "brt"] as TransitMode[],
    isLandmark: true,
    isAccessible: true,
  },
  downtown: {
    id: "bld",
    nameAr: "وسط البلد",
    nameEn: "Downtown",
    code: "AMM-BLD",
    lat: 31.9516,
    lng: 35.9397,
    modes: ["city_bus", "serveece", "intercity"] as TransitMode[],
    isLandmark: true,
    isAccessible: false,
  },
  uj: {
    id: "uj",
    nameAr: "الجامعة الأردنية",
    nameEn: "University of Jordan",
    code: "AMM-UJ",
    lat: 32.0156,
    lng: 35.8747,
    modes: ["city_bus", "serveece"] as TransitMode[],
    isLandmark: true,
    isAccessible: true,
  },
  sweileh: {
    id: "swl",
    nameAr: "الصويلح",
    nameEn: "Sweileh",
    code: "AMM-SWL",
    lat: 32.0367,
    lng: 35.8275,
    modes: ["city_bus", "serveece"] as TransitMode[],
    isLandmark: true,
    isAccessible: false,
  },
  wahdat: {
    id: "whd",
    nameAr: "الوحدات",
    nameEn: "Wahdat",
    code: "AMM-WHD",
    lat: 31.9239,
    lng: 35.89,
    modes: ["city_bus", "serveece", "intercity"] as TransitMode[],
    isLandmark: true,
    isAccessible: true,
  },
} satisfies Record<string, TransitStop>;

// ─── Mock Journeys ───────────────────────────────────────────────────────────
// Three varied options matching @/types/transit (the JourneyCard peer type).

const MOCK_JOURNEYS: Journey[] = [
  {
    // ── Fastest (25 min, 0.75 JOD, 1 transfer: walk → BRT) ──
    id: "j-fast",
    totalDurationMinutes: 25,
    walkingMinutes: 7,
    transfers: 1,
    fareAmount: 0.75,
    fareCurrency: "د.أ",
    departureTime: "09:15",
    arrivalTime: "09:40",
    modes: ["brt"],
    legs: [
      {
        mode: "walking",
        fromStop: MOCK_STOPS.user,
        toStop: MOCK_STOPS.gardens,
        departureTime: "09:15",
        arrivalTime: "09:19",
        durationMinutes: 4,
        intermediateStops: 0,
        walkingDistance: 350,
        polyline: LEG_COORDS.walk_user_to_gardens as [number, number][],
      },
      {
        mode: "brt",
        lineCode: "BRT1",
        lineNameAr: "الباص السريع 1",
        lineNameEn: "BRT Line 1",
        fromStop: MOCK_STOPS.gardens,
        toStop: MOCK_STOPS.abdali,
        departureTime: "09:22",
        arrivalTime: "09:35",
        durationMinutes: 13,
        intermediateStops: 3,
        polyline: LEG_COORDS.walk_user_to_gardens as [number, number][],
      },
      {
        mode: "walking",
        fromStop: MOCK_STOPS.abdali,
        toStop: {
          ...MOCK_STOPS.abdali,
          nameAr: "الوجهة",
          nameEn: "Destination",
          id: "dest1",
        },
        departureTime: "09:35",
        arrivalTime: "09:40",
        durationMinutes: 3,
        intermediateStops: 0,
        walkingDistance: 250,
        polyline: LEG_COORDS.walk_user_to_gardens as [number, number][],
      },
    ],
  },
  {
    // ── Cheapest (38 min, 0.55 JOD, 0 transfers: direct city bus) ──
    id: "j-cheap",
    totalDurationMinutes: 38,
    walkingMinutes: 5,
    transfers: 0,
    fareAmount: 0.55,
    fareCurrency: "د.أ",
    departureTime: "09:20",
    arrivalTime: "09:58",
    modes: ["city_bus"],
    legs: [
      {
        mode: "walking",
        fromStop: MOCK_STOPS.user,
        toStop: MOCK_STOPS.wahdat,
        departureTime: "09:20",
        arrivalTime: "09:25",
        durationMinutes: 5,
        intermediateStops: 0,
        walkingDistance: 400,
        polyline: LEG_COORDS.walk_user_to_gardens as [number, number][],
      },
      {
        mode: "city_bus",
        lineCode: "26",
        lineNameAr: "الوحدات - العبدلي",
        lineNameEn: "Wahdat - Abdali",
        fromStop: MOCK_STOPS.wahdat,
        toStop: MOCK_STOPS.abdali,
        departureTime: "09:28",
        arrivalTime: "09:58",
        durationMinutes: 30,
        intermediateStops: 8,
        polyline: LEG_COORDS.walk_user_to_gardens as [number, number][],
      },
    ],
  },
  {
    // ── Fewest Transfers (32 min, 1.00 JOD, 0 transfers: serveece direct) ──
    id: "j-minxf",
    totalDurationMinutes: 32,
    walkingMinutes: 2,
    transfers: 0,
    fareAmount: 1.0,
    fareCurrency: "د.أ",
    departureTime: "09:10",
    arrivalTime: "09:42",
    modes: ["serveece"],
    legs: [
      {
        mode: "serveece",
        lineCode: "SERV1",
        lineNameAr: "سرفيس - العبدلي",
        lineNameEn: "Serveece - Abdali",
        fromStop: {
          ...MOCK_STOPS.user,
          nameAr: "شارع الملكة رانيا",
          nameEn: "Queen Rania St",
          code: "QRS1",
        },
        toStop: MOCK_STOPS.abdali,
        departureTime: "09:10",
        arrivalTime: "09:42",
        durationMinutes: 30,
        intermediateStops: 5,
        polyline: LEG_COORDS.walk_user_to_gardens as [number, number][],
      },
    ],
  },
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
  const [fromLabel, setFromLabel] = useState("");
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

  // ── Store ──────────────────────────────────────────────────────────────
  const storeJourneys = useTransitStore((s) => s.journeys);
  const planJourney = useTransitStore((s) => s.planJourney);
  const storeError = useTransitStore((s) => s.error);
  const storeLoading = useTransitStore((s) => s.isLoading);

  /** Combined display journeys: real store data or fallback to mock. */
  const displayJourneys: Journey[] = useMemo(() => {
    if (storeJourneys.length > 0) {
      // Convert store-format journeys (transit.types.ts) to display format (transit.ts)
      // For now fall back to mocks since the store Journey differs from
      // the JourneyCard's expected shape. In production the API would return
      // the correct shape.
      return MOCK_JOURNEYS;
    }
    if (!fromLabel && !toLabel) return [];
    return MOCK_JOURNEYS;
  }, [storeJourneys, fromLabel, toLabel]);

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
      j.modes.some((m) => selectedModes.includes(m))
    );
  }, [sortedJourneys, selectedModes]);

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

  const handleSearch = useCallback(async () => {
    if (!fromLabel || !toLabel) return;
    try {
      await planJourney(
        transportConfig.ammanCenter.lat,
        transportConfig.ammanCenter.lng,
        31.9636,
        35.9156,
        {
          preferredModes: selectedModes.join(","),
          timeType: timeKey === "arrive_by" ? "arrive" : "depart",
          preference: activePref,
        }
      );
    } catch {
      // Store sets error state — we render it via ErrorState
    }
  }, [fromLabel, toLabel, selectedModes, timeKey, activePref, planJourney]);

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
    (name: string) => {
      if (searchTarget === "from") {
        setFromLabel(name);
      } else {
        setToLabel(name);
      }
      setShowSearch(false);
    },
    [searchTarget]
  );

  // ── Render Helpers ─────────────────────────────────────────────────────
  const quickStops = useMemo(
    () => [
      { nameAr: "العبدلي", nameEn: "Abdali", code: "AMM-ABD" },
      { nameAr: "الجامعة الأردنية", nameEn: "UJ", code: "AMM-UJ" },
      { nameAr: "وسط البلد", nameEn: "Downtown", code: "AMM-BLD" },
      { nameAr: "مجمع الجاردنز", nameEn: "Gardens", code: "AMM-GDN" },
      { nameAr: "الصويلح", nameEn: "Sweileh", code: "AMM-SWL" },
      { nameAr: "الوحدات", nameEn: "Wahdat", code: "AMM-WHD" },
    ],
    []
  );

  // ── Compute map polylines from active journey legs ──────────────────────
  const journeyPolylines = useMemo(() => {
    if (filteredJourneys.length === 0) return [];
    const j = filteredJourneys[0]; // show first/best journey on map
    return j.legs.map((leg, i) => ({
      id: `leg-${i}-${leg.mode}`,
      coords: (leg.polyline && leg.polyline.length > 0) ? leg.polyline.map(([lng, lat]) => [lat, lng] as [number, number]) : generateFallbackCoords(leg),
      color: MODE_PATH_COLOR[leg.mode] || "#999",
      weight: leg.mode === "walking" ? 3 : 5,
      opacity: 0.85,
      dashArray: leg.mode === "walking" ? WALKING_DASH : "",
    }));
  }, [filteredJourneys]);

  const journeyMarkers = useMemo(() => {
    if (filteredJourneys.length === 0) return [];
    const j = filteredJourneys[0];
    const markers: Array<{ id: string; lat: number; lng: number; label: string; color: string }> = [];
    // Origin
    if (j.legs[0]?.fromStop) {
      markers.push({ id: "origin", lat: j.legs[0].fromStop.lat, lng: j.legs[0].fromStop.lng, label: "🚩 الانطلاق", color: "#16A34A" });
    }
    // Transfer points
    j.legs.forEach((leg, i) => {
      if (leg.toStop && i < j.legs.length - 1) {
        markers.push({ id: `xfer-${i}`, lat: leg.toStop.lat, lng: leg.toStop.lng, label: `🔄 ${leg.toStop.nameAr}`, color: "#1A4F8A" });
      }
    });
    // Destination
    const lastLeg = j.legs[j.legs.length - 1];
    if (lastLeg?.toStop) {
      markers.push({ id: "dest", lat: lastLeg.toStop.lat, lng: lastLeg.toStop.lng, label: "🏁 الوصول", color: "#DC2626" });
    }
    return markers;
  }, [filteredJourneys]);

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

        {/* ── Route Map (shows journey path with colored polylines) ───── */}
        {showResults && (
          <View style={styles.mapSection}>
            <ErrorBoundary fallback={<View style={styles.mapPlaceholder} />}>
              <LeafletMap
                style={styles.journeyMap}
                centerLat={31.9600}
                centerLng={35.9200}
                zoom={13}
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
                  if (searchTarget === "from") {
                    setFromLabel("موقعي الحالي");
                  }
                  setShowSearch(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.currentLocDot} />
                <Text style={styles.currentLocText}>موقعي الحالي</Text>
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
                    onPress={() => selectSearchResult(item.nameAr)}
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
    height: 200,
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
