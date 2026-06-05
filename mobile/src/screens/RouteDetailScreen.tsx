// ============================================================================
// دروب (Droob) — Route Detail Screen (تفاصيل الخط)
// Redesigned: route header + mode badge, quick stats, fare info,
// tab switcher (Stops Timeline | Live Vehicles), pull-to-refresh,
// loading/error/empty states, RTL Arabic, ErrorBoundary.
// ============================================================================
import { useInterstitialAd } from "@components/AdInterstitial";
import { useRewardedAd } from "@components/AdRewarded";
import { AD_INTERSTITIAL_ROUTE, AD_REWARDED_ROUTE_DETAILS } from "@config/ads";
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Platform,
  type ViewStyle,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInRight,
  Layout as ReLayout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import {
  colors,
  transitColorMap,
  radius,
  spacing,
  fontSize,
  fontWeight,
  shadows,
} from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { OccupancyLevel } from "@/types/transit";
import type { TransportMode, Stop } from "@/types/transit.types";
import { OccupancyIndicator } from "@components/OccupancyIndicator";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { FARE } from "@/config/transport.config";
import { routesApi } from "@/services/api-client";
import { analytics } from "@/services/analytics";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const SHIMMER_STOP_COUNT = 5;
const SHIMMER_VEHICLE_COUNT = 3;

type TabKey = "stops" | "vehicles";

// ═══════════════════════════════════════════════════════════════════════════════
//  LOCAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface RouteStop {
  id: string;
  nameAr: string;
  sequence: number;
  arrival?: string;
  isTerminal: boolean;
  hasShelter: boolean;
  hasLighting: boolean;
  hasAccessibility: boolean;
}

interface LiveVehicle {
  id: string;
  vehicleId: string;
  plateNumber: string;
  lat: number;
  lng: number;
  speedKmh: number;
  heading: number;
  occupancy: OccupancyLevel;
  status: "active" | "idle" | "maintenance" | "offline";
  nextStopAr?: string;
  lastSeen: string;
}

interface RouteInfo {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  mode: TransportMode;
  color: string;
  operator: string;
  fromNameAr: string;
  toNameAr: string;
  distanceKm: number;
  durationMin: number;
  fareJod: number;
  headwayMin: number | null;
  schedule: string;
  fridaySchedule: string;
  hasFridaySchedule: boolean;
  features: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_LABELS: Record<string, string> = {
  city_bus: "باص مدني",
  brt: "باص سريع",
  serveece: "سرفيس",
  intercity: "بين المدن",
};

const VEHICLE_STATUS_CONFIG: Record<string, { label: string; color: string; dot: string }> = {
  active: { label: "نشط", color: colors.on_time, dot: colors.on_time },
  idle: { label: "متوقف", color: colors.delayed, dot: colors.delayed },
  maintenance: { label: "صيانة", color: colors.cancelled, dot: colors.cancelled },
  offline: { label: "غير متصل", color: colors.text_tertiary, dot: colors.text_tertiary },
};

/** Format JOD fare with currency symbol and optional transfer discount note */
function formatFare(baseFare: number): { base: string; transferNote: string } {
  const discount = FARE.TRANSFER_DISCOUNT;
  const windowMin = FARE.TRANSFER_WINDOW_MIN;
  const discounted = (baseFare * (1 - discount)).toFixed(3);
  return {
    base: `${baseFare.toFixed(3)} ${FARE.CURRENCY}`,
    transferNote: `خصم التحويل: ${discounted} ${FARE.CURRENCY} (خصم ${Math.round(discount * 100)}% ضمن ${windowMin} دقيقة)`,
  };
}

/** Map a canonical Stop to a RouteStop */
function stopToRouteStop(s: Stop, index: number): RouteStop {
  return {
    id: s.id,
    nameAr: s.name_ar,
    sequence: index + 1,
    arrival: undefined,
    isTerminal: s.isTerminal,
    hasShelter: s.hasShelter,
    hasLighting: s.hasLighting,
    hasAccessibility: s.hasAccessibility,
  };
}

/** Map a canonical Route to a RouteInfo */
function routeToRouteInfo(r: any): RouteInfo {
  return {
    id: r.id,
    code: r.code,
    nameAr: r.name_ar,
    nameEn: r.name_en,
    mode: r.mode,
    color: r.color,
    operator: r.agencyId || "أمانة عمان الكبرى",
    fromNameAr: r.originName_ar || "",
    toNameAr: r.destinationName_ar || "",
    distanceKm: r.distance_km || 0,
    durationMin: r.duration_min || 0,
    fareJod: r.fare_jod || 0,
    headwayMin: r.headway_min || null,
    schedule: "٥:٣٠ صباحاً — ١١:٠٠ مساءً",
    fridaySchedule: "٥:٣٠ ص — ١١:٠٠ ص | ١:٣٠ م — ١٠:٠٠ م",
    hasFridaySchedule: r.hasFridaySchedule ?? true,
    features: ["مسار مخصص", "محطات مكيفة", "شاشات إلكترونية"],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHIMMER LOADING
// ═══════════════════════════════════════════════════════════════════════════════

const ShimmerBlock: React.FC<{ style?: ViewStyle }> = ({ style }) => {
  const opacityVal = useSharedValue(0.3);
  useEffect(() => {
    opacityVal.value = withRepeat(
      withSequence(withTiming(1, { duration: 800 }), withTiming(0.3, { duration: 800 })),
      -1,
      true,
    );
  }, []);
  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacityVal.value }));
  return <Animated.View style={[animatedStyle, { backgroundColor: colors.surface_3, borderRadius: radius.sm }, style]} />;
};

const StopSkeletonRow: React.FC = () => (
  <View style={skel.stopRow}>
    <View style={skel.timeline}>
      <ShimmerBlock style={{ width: 12, height: 12, borderRadius: 6 }} />
      <ShimmerBlock style={{ width: 3, flex: 1, borderRadius: 2 }} />
    </View>
    <View style={skel.stopInfo}>
      <ShimmerBlock style={{ width: "65%", height: 16 }} />
      <ShimmerBlock style={{ width: "35%", height: 12, marginTop: 6 }} />
    </View>
  </View>
);

const VehicleSkeletonCard: React.FC = () => (
  <View style={skel.vehicleCard}>
    <View style={skel.vehicleLeft}>
      <ShimmerBlock style={{ width: 44, height: 44, borderRadius: radius.lg }} />
      <View style={{ gap: 4 }}>
        <ShimmerBlock style={{ width: 80, height: 15 }} />
        <ShimmerBlock style={{ width: 60, height: 11 }} />
      </View>
    </View>
    <ShimmerBlock style={{ width: 70, height: 24, borderRadius: radius.pill }} />
  </View>
);

const skel = StyleSheet.create({
  stopRow: { flexDirection: "row", gap: 14, minHeight: 56, paddingRight: spacing[4] },
  timeline: { alignItems: "center", width: 16, gap: 2 },
  stopInfo: { flex: 1, gap: 2, paddingBottom: 12 },
  vehicleCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    marginBottom: spacing[3],
  },
  vehicleLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  LOADING SKELETON - COMPLETE SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

const LoadingSkeleton: React.FC = () => (
  <View style={ls.root}>
    {/* Header shimmer */}
    <View style={ls.header}>
      <View style={{ flexDirection: "row", gap: 14, alignItems: "center" }}>
        <ShimmerBlock style={{ width: 56, height: 56, borderRadius: radius.lg }} />
        <View style={{ flex: 1, gap: 4 }}>
          <ShimmerBlock style={{ width: "70%", height: 20 }} />
          <ShimmerBlock style={{ width: "50%", height: 14 }} />
        </View>
      </View>
    </View>
    {/* Stats shimmer */}
    <View style={ls.statsRow}>
      {[1, 2, 3, 4].map((i) => (
        <View key={i} style={ls.statCard}>
          <ShimmerBlock style={{ width: 18, height: 18, borderRadius: 9 }} />
          <ShimmerBlock style={{ width: 30, height: 10 }} />
          <ShimmerBlock style={{ width: 50, height: 16 }} />
        </View>
      ))}
    </View>
    {/* Tab shimmer */}
    <View style={ls.tabRow}>
      <ShimmerBlock style={{ flex: 1, height: 36, borderRadius: radius.sm }} />
      <ShimmerBlock style={{ flex: 1, height: 36, borderRadius: radius.sm }} />
    </View>
    {/* List shimmer */}
    <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[4] }}>
      {Array.from({ length: SHIMMER_STOP_COUNT }).map((_, i) => (
        <StopSkeletonRow key={i} />
      ))}
    </View>
  </View>
);

const ls = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { padding: spacing[5], paddingBottom: spacing[4] },
  statsRow: { flexDirection: "row", paddingHorizontal: spacing[4], gap: spacing[2], marginBottom: spacing[3] },
  statCard: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing[3], alignItems: "center", gap: 4 },
  tabRow: { flexDirection: "row", marginHorizontal: spacing[4], gap: spacing[2], height: 40 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ERROR STATE
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorStateProps { message: string; onRetry: () => void; }

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <View style={err.root}>
    <Text style={err.icon}>⚠️</Text>
    <Text style={err.title}>تعذر تحميل تفاصيل الخط</Text>
    <Text style={err.msg}>{message}</Text>
    <TouchableOpacity style={err.btn} onPress={onRetry} activeOpacity={0.8}>
      <Text style={err.btnText}>إعادة المحاولة</Text>
    </TouchableOpacity>
  </View>
);

const err = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing[8], gap: 12 },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary, textAlign: "center" },
  msg: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, textAlign: "center", lineHeight: 22 },
  btn: { backgroundColor: colors.brand_blue, borderRadius: radius.pill, paddingHorizontal: 32, paddingVertical: 14, marginTop: 12 },
  btnText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.bold, color: colors.white },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EMPTY STATE (shared by both tabs)
// ═══════════════════════════════════════════════════════════════════════════════

const EmptyState: React.FC<{ tab: TabKey; isVehicles: boolean }> = ({ tab }) => {
  const icon = tab === "stops" ? "🚏" : "🚌";
  const title = tab === "stops" ? "لا توجد محطات" : "لا توجد مركبات نشطة";
  const subtitle = tab === "stops" ? "لم يتم تحميل محطات لهذا الخط" : "لا توجد مركبات تعمل على هذا الخط حالياً";
  return (
    <View style={empty.root}>
      <Text style={empty.icon}>{icon}</Text>
      <Text style={empty.title}>{title}</Text>
      <Text style={empty.subtitle}>{subtitle}</Text>
    </View>
  );
};

const empty = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing[8], gap: 8, minHeight: 260 },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary },
  subtitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, textAlign: "center", lineHeight: 22, paddingHorizontal: spacing[8] },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ROUTE HEADER
// ═══════════════════════════════════════════════════════════════════════════════

interface RouteHeaderProps {
  route: RouteInfo;
  onDirectionToggle?: () => void;
  isReverse?: boolean;
}

const RouteHeader: React.FC<RouteHeaderProps> = ({ route, onDirectionToggle, isReverse }) => {
  const modeColor = transitColorMap[route.mode as TransitMode] || route.color;
  const modeLabel = MODE_LABELS[route.mode] || route.mode;

  return (
    <View style={[header.root, { backgroundColor: modeColor + "0D" }]}>
      {/* Mode badge */}
      <View style={[header.badge, { backgroundColor: modeColor }]}>
        <MaterialCommunityIcons name="bus-clock" size={24} color={colors.white} />
      </View>

      {/* Route name + meta */}
      <View style={header.info}>
        <View style={header.codeRow}>
          <View style={[header.modePill, { backgroundColor: modeColor + "20" }]}>
            <Text style={[header.modeLabel, { color: modeColor }]}>{modeLabel}</Text>
          </View>
          <Text style={[header.code, { color: modeColor }]}>{route.code}</Text>
        </View>
        <Text style={header.name} numberOfLines={2}>{route.nameAr}</Text>
        <View style={header.fromTo}>
          <Text style={header.fromToText} numberOfLines={1}>
            {route.fromNameAr} ← {route.toNameAr}
          </Text>
        </View>
        <Text style={header.operator}>{route.operator}</Text>
      </View>

      {/* Direction toggle */}
      {onDirectionToggle && (
        <TouchableOpacity
          style={header.dirBtn}
          onPress={onDirectionToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel={isReverse ? "الاتجاه الأصلي" : "الاتجاه المعاكس"}
        >
          <MaterialCommunityIcons
            name="swap-vertical-bold"
            size={20}
            color={modeColor}
          />
        </TouchableOpacity>
      )}
    </View>
  );
};

const header = StyleSheet.create({
  root: {
    flexDirection: "row",
    padding: spacing[5],
    paddingBottom: spacing[4],
    gap: spacing[3],
    alignItems: "flex-start",
  },
  badge: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  info: { flex: 1, gap: 3 },
  codeRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: 2 },
  modePill: { paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.pill },
  modeLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], fontWeight: fontWeight.bold as any },
  code: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[20], fontWeight: fontWeight.bold as any, letterSpacing: 0.5 },
  name: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.semiBold as any, color: colors.text_primary },
  fromTo: { marginTop: 2 },
  fromToText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_secondary },
  operator: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary, marginTop: 2 },
  dirBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.sm,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  QUICK STATS ROW (unchanged)
// ═══════════════════════════════════════════════════════════════════════════════

interface StatTileProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}

const StatTile: React.FC<StatTileProps> = React.memo(({ icon, label, value, color }) => (
  <View style={stat.root}>
    <View style={[stat.iconWrap, { backgroundColor: color + "12" }]}>
      {icon}
    </View>
    <Text style={stat.value}>{value}</Text>
    <Text style={stat.label}>{label}</Text>
  </View>
));

const stat = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[3],
    alignItems: "center",
    gap: 3,
    ...shadows.sm,
  },
  iconWrap: { width: 32, height: 32, borderRadius: radius.full, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  value: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.bold as any, color: colors.text_primary, textAlign: "center" },
  label: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary, textAlign: "center" },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FARE CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface FareCardProps {
  fareJod: number;
  color: string;
}

const FareCard: React.FC<FareCardProps> = React.memo(({ fareJod, color }) => {
  const fare = formatFare(fareJod);
  return (
    <View style={fareC.root}>
      <View style={fareC.leftCol}>
        <MaterialCommunityIcons name="cash" size={20} color={colors.gold_accent} />
        <Text style={fareC.title}>الأجرة</Text>
      </View>
      <View style={fareC.rightCol}>
        <Text style={[fareC.baseFare, { color }]}>{fare.base}</Text>
        <Text style={fareC.transferNote}>{fare.transferNote}</Text>
      </View>
    </View>
  );
});

const fareC = StyleSheet.create({
  root: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    gap: spacing[3],
    alignItems: "flex-start",
    ...shadows.sm,
  },
  leftCol: { flexDirection: "row", alignItems: "center", gap: spacing[2], minWidth: 80 },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.bold as any, color: colors.text_primary },
  rightCol: { flex: 1, gap: 4 },
  baseFare: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold as any },
  transferNote: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary, lineHeight: 16 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  SCHEDULE CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface ScheduleCardProps {
  schedule: string;
  fridaySchedule: string;
  hasFriday: boolean;
  headwayMin: number | null;
}

const ScheduleCard: React.FC<ScheduleCardProps> = React.memo(({ schedule, fridaySchedule, hasFriday, headwayMin }) => (
  <View style={sched.root}>
    <View style={sched.titleRow}>
      <MaterialCommunityIcons name="calendar-clock" size={18} color={colors.text_primary} />
      <Text style={sched.title}>مواعيد التشغيل</Text>
    </View>
    {headwayMin && (
      <View style={sched.row}>
        <Text style={sched.label}>📊 التكرار:</Text>
        <Text style={sched.value}>كل {headwayMin} دقيقة</Text>
      </View>
    )}
    <View style={sched.row}>
      <Text style={sched.label}>🗓 أيام الأسبوع:</Text>
      <Text style={sched.value}>{schedule}</Text>
    </View>
    {hasFriday && (
      <View style={sched.row}>
        <Text style={sched.label}>🕌 الجمعة:</Text>
        <Text style={sched.value}>{fridaySchedule}</Text>
      </View>
    )}
  </View>
));

const sched = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    gap: spacing[2],
    ...shadows.sm,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: spacing[1] },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.bold as any, color: colors.text_primary },
  row: { flexDirection: "row", gap: spacing[2] },
  label: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], fontWeight: fontWeight.medium as any, color: colors.text_secondary, minWidth: 80 },
  value: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_primary, flex: 1 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FEATURES / TAGS ROW
// ═══════════════════════════════════════════════════════════════════════════════

interface FeaturesRowProps {
  features: string[];
  color: string;
}

const FeaturesRow: React.FC<FeaturesRowProps> = React.memo(({ features, color }) => (
  <View style={feat.root}>
    <View style={feat.titleRow}>
      <MaterialCommunityIcons name="star-outline" size={16} color={colors.text_primary} />
      <Text style={feat.title}>مميزات الخط</Text>
    </View>
    <View style={feat.chips}>
      {features.map((f, i) => (
        <View key={i} style={[feat.chip, { backgroundColor: color + "12" }]}>
          <Text style={[feat.chipText, { color }]}>✓ {f}</Text>
        </View>
      ))}
    </View>
  </View>
));

const feat = StyleSheet.create({
  root: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    gap: spacing[2],
    ...shadows.sm,
  },
  titleRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.bold as any, color: colors.text_primary },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2] },
  chip: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.pill },
  chipText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], fontWeight: fontWeight.semiBold as any },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  TAB SWITCHER
// ═══════════════════════════════════════════════════════════════════════════════

interface TabSwitcherProps {
  activeTab: TabKey;
  onTabChange: (tab: TabKey) => void;
  stopCount: number;
  vehicleCount: number;
  color: string;
}

const TabSwitcher: React.FC<TabSwitcherProps> = React.memo(({ activeTab, onTabChange, stopCount, vehicleCount, color }) => {
  const tabs: { key: TabKey; icon: string; label: string; count: number }[] = [
    { key: "stops", icon: "bus-stop-covered", label: "المحطات", count: stopCount },
    { key: "vehicles", icon: "bus-marker", label: "المركبات", count: vehicleCount },
  ];
  return (
    <View style={tabSw.root}>
      {tabs.map((t) => {
        const isActive = activeTab === t.key;
        return (
          <TouchableOpacity
            key={t.key}
            style={[tabSw.tab, isActive && { backgroundColor: colors.surface, ...shadows.sm }]}
            onPress={() => onTabChange(t.key)}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <MaterialCommunityIcons
              name={t.icon as any}
              size={18}
              color={isActive ? color : colors.text_tertiary}
            />
            <Text style={[tabSw.label, isActive && { color, fontWeight: fontWeight.bold as any }]}>
              {t.label} ({t.count})
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
});

const tabSw = StyleSheet.create({
  root: {
    flexDirection: "row",
    marginHorizontal: spacing[4],
    marginTop: spacing[4],
    backgroundColor: colors.surface_2,
    borderRadius: radius.input,
    padding: 3,
    gap: 2,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    borderRadius: radius.sm,
    gap: spacing[1],
  },
  label: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium as any, color: colors.text_secondary },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  STOP TIMELINE ROW
// ═══════════════════════════════════════════════════════════════════════════════

interface StopRowProps {
  stop: RouteStop;
  index: number;
  total: number;
  color: string;
  onPress: (stop: RouteStop) => void;
}

const StopRow: React.FC<StopRowProps> = React.memo(({ stop, index, total, color, onPress }) => {
  const isFirst = index === 0;
  const isLast = index === total - 1;

  return (
    <Animated.View entering={FadeInRight.duration(250).delay(index * 30)} layout={ReLayout.springify()}>
      <TouchableOpacity
        style={stopR.row}
        onPress={() => onPress(stop)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`محطة ${stop.nameAr}`}
      >
        {/* Timeline */}
        <View style={stopR.timeline}>
          {isFirst ? (
            <View style={[stopR.dotTerminal, { backgroundColor: color }]}>
              <View style={stopR.dotInner} />
            </View>
          ) : isLast ? (
            <View style={[stopR.dotLast, { borderColor: colors.on_time }]}>
              <View style={[stopR.dotFillLast, { backgroundColor: colors.on_time }]} />
            </View>
          ) : (
            <View style={[stopR.dot, { backgroundColor: color }]} />
          )}
          {!isLast && <View style={[stopR.line, { backgroundColor: color + "30" }]} />}
        </View>

        {/* Stop info */}
        <View style={stopR.info}>
          <View style={stopR.nameRow}>
            <Text style={stopR.name}>{stop.nameAr}</Text>
            {stop.isTerminal && (
              <View style={[stopR.terminalBadge, { backgroundColor: color + "15" }]}>
                <Text style={[stopR.terminalLabel, { color }]}>محطة رئيسية</Text>
              </View>
            )}
          </View>
          <View style={stopR.metaRow}>
            {stop.arrival ? (
              <View style={stopR.timeTag}>
                <MaterialCommunityIcons name="clock-outline" size={12} color={colors.text_tertiary} />
                <Text style={stopR.time}>{stop.arrival}</Text>
              </View>
            ) : null}
            <View style={stopR.amenities}>
              {stop.hasShelter && (
                <MaterialCommunityIcons name="umbrella" size={13} color={colors.text_tertiary} accessibilityLabel="مظلة" />
              )}
              {stop.hasLighting && (
                <MaterialCommunityIcons name="lightbulb-on-outline" size={13} color={colors.text_tertiary} accessibilityLabel="إضاءة" />
              )}
              {stop.hasAccessibility && (
                <MaterialCommunityIcons name="wheelchair-accessibility" size={13} color={colors.text_tertiary} accessibilityLabel="مناسب لذوي الاحتياجات" />
              )}
            </View>
          </View>
        </View>

        {/* Chevron */}
        <MaterialCommunityIcons name="chevron-left" size={18} color={colors.text_tertiary} />
      </TouchableOpacity>
    </Animated.View>
  );
});

const stopR = StyleSheet.create({
  row: { flexDirection: "row", gap: spacing[2], minHeight: 64, alignItems: "center", paddingRight: spacing[4] },
  timeline: { alignItems: "center", width: 20, paddingTop: 2 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: colors.surface },
  dotTerminal: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  dotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.white },
  dotLast: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  dotFillLast: { width: 10, height: 10, borderRadius: 5 },
  line: { width: 3, flex: 1, minHeight: 20, borderRadius: 2, marginTop: 2 },
  info: { flex: 1, paddingVertical: spacing[3], gap: 4 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  name: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold as any, color: colors.text_primary },
  terminalBadge: { paddingHorizontal: spacing[2], paddingVertical: 1, borderRadius: radius.pill },
  terminalLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], fontWeight: fontWeight.semiBold as any },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  timeTag: { flexDirection: "row", alignItems: "center", gap: 4 },
  time: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary },
  amenities: { flexDirection: "row", gap: spacing[1] },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  VEHICLE CARD
// ═══════════════════════════════════════════════════════════════════════════════

interface VehicleCardProps {
  vehicle: LiveVehicle;
  color: string;
}

const VehicleCard: React.FC<VehicleCardProps> = React.memo(({ vehicle, color }) => {
  const statusCfg = VEHICLE_STATUS_CONFIG[vehicle.status] || VEHICLE_STATUS_CONFIG.offline;
  const timeAgo = getTimeAgo(vehicle.lastSeen);

  return (
    <Animated.View entering={FadeInDown.duration(300)} layout={ReLayout.springify()}>
      <View style={vhc.card}>
        <View style={vhc.topRow}>
          {/* Left: icon + info */}
          <View style={vhc.leftCol}>
            <View style={[vhc.iconWrap, { backgroundColor: color + "15" }]}>
              <MaterialCommunityIcons name="bus-side" size={22} color={color} />
            </View>
            <View style={vhc.infoCol}>
              <Text style={vhc.plate}>{vehicle.plateNumber}</Text>
              <View style={vhc.metaRow}>
                <MaterialCommunityIcons name="speedometer" size={12} color={colors.text_tertiary} />
                <Text style={vhc.meta}>{vehicle.speedKmh} كم/س</Text>
              </View>
            </View>
          </View>

          {/* Right: occupancy + status */}
          <View style={vhc.rightCol}>
            <OccupancyIndicator level={vehicle.occupancy} size="sm" />
            <View style={[vhc.statusDot, { backgroundColor: statusCfg.dot }]} />
          </View>
        </View>

        {/* Bottom: next stop + heading */}
        <View style={vhc.bottomRow}>
          <View style={vhc.nextStop}>
            <MaterialCommunityIcons name="map-marker-outline" size={13} color={colors.text_secondary} />
            <Text style={vhc.nextStopText} numberOfLines={1}>
              {vehicle.nextStopAr || "—"}
            </Text>
          </View>
          <View style={vhc.heading}>
            <MaterialCommunityIcons
              name="navigation-variant-outline"
              size={12}
              color={colors.text_tertiary}
              style={{ transform: [{ rotate: `${vehicle.heading}deg` }] }}
            />
            <Text style={vhc.timestamp}>{timeAgo}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
});

/** Simple relative time in Arabic */
function getTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const hrs = Math.floor(min / 60);
  return `منذ ${hrs} س`;
}

const vhc = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    gap: spacing[3],
    ...shadows.sm,
  },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  leftCol: { flexDirection: "row", alignItems: "center", gap: spacing[3] },
  iconWrap: { width: 44, height: 44, borderRadius: radius.lg, alignItems: "center", justifyContent: "center" },
  infoCol: { gap: 3 },
  plate: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold as any, color: colors.text_primary },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  meta: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary },
  rightCol: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: spacing[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  nextStop: { flexDirection: "row", alignItems: "center", gap: 4, flex: 1 },
  nextStopText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary },
  heading: { flexDirection: "row", alignItems: "center", gap: 4 },
  timestamp: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

const RouteDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<RootStackParamList, "RouteDetail">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { routeId } = route.params;

  // ── State ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<TabKey>("stops");
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── Data state ─────────────────────────────────────────────────────────
  const [routeInfo, setRouteInfo] = useState<RouteInfo | null>(null);
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [vehicles] = useState<LiveVehicle[]>([]);

  // ── Ad hooks ───────────────────────────────────────────────────────────
  const interstitialRoute = useInterstitialAd(AD_INTERSTITIAL_ROUTE, "route");
  const rewardedDetails = useRewardedAd(AD_REWARDED_ROUTE_DETAILS, "route_details");

  // ── Fetch data from API ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [routeData, stopsData] = await Promise.all([
        routesApi.getById(routeId),
        routesApi.getStops(routeId),
      ]);
      setRouteInfo(routeToRouteInfo(routeData));
      const apiStops = (stopsData as any)?.data ?? (Array.isArray(stopsData) ? stopsData : []);
      setStops(apiStops.map((s: Stop, i: number) => stopToRouteStop(s, i)));
    } catch (e: any) {
      setError(e?.message || "فشل تحميل بيانات الخط");
    } finally {
      setIsLoading(false);
    }
  }, [routeId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Track route view on mount ──────────────────────────────────────────
  useEffect(() => {
    const { routeId: rid } = route.params;
    analytics.trackRouteView(rid, '');
  }, [route.params]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchData();
    } catch (e: any) {
      setError(e?.message || "فشل التحديث");
    }
    setRefreshing(false);
  }, [fetchData]);

  // ── Derived values ────────────────────────────────────────────────────
  const modeColor = useMemo(
    () => (routeInfo ? transitColorMap[routeInfo.mode as TransitMode] || routeInfo.color : colors.brand_blue),
    [routeInfo],
  );

  const fareInfo = useMemo(
    () => (routeInfo ? formatFare(routeInfo.fareJod) : { base: "", transferNote: "" }),
    [routeInfo],
  );

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleStopPress = useCallback(
    (stop: RouteStop) => {
      navigation.navigate("StopDetail", { stopId: stop.id, stopName: stop.nameAr });
    },
    [navigation],
  );

  const handleTabChange = useCallback((tab: TabKey) => {
    setActiveTab(tab);
  }, []);

  // ── Header component (shared between both tabs) ────────────────────────
  const listHeader = useMemo(
    () => {
      if (!routeInfo) return null;
      return (
        <View>
          {/* Route header */}
          <RouteHeader route={routeInfo} />

          {/* Quick stats */}
          <View style={main.statsRow}>
            <StatTile
              icon={<MaterialCommunityIcons name="clock-outline" size={18} color={modeColor} />}
              label="المدة"
              value={`${routeInfo.durationMin} د`}
              color={modeColor}
            />
            <StatTile
              icon={<MaterialCommunityIcons name="map-marker-distance" size={18} color={modeColor} />}
              label="المسافة"
              value={`${routeInfo.distanceKm} كم`}
              color={modeColor}
            />
            <StatTile
              icon={<MaterialCommunityIcons name="cash-multiple" size={18} color={modeColor} />}
              label="الأجرة"
              value={fareInfo.base}
              color={modeColor}
            />
            <StatTile
              icon={<MaterialCommunityIcons name="sync" size={18} color={modeColor} />}
              label="التكرار"
              value={routeInfo.headwayMin ? `كل ${routeInfo.headwayMin} د` : "—"}
              color={modeColor}
            />
          </View>

          {/* Fare detail card */}
          <FareCard fareJod={routeInfo.fareJod} color={modeColor} />

          {/* Schedule */}
          <ScheduleCard
            schedule={routeInfo.schedule}
            fridaySchedule={routeInfo.fridaySchedule}
            hasFriday={routeInfo.hasFridaySchedule}
            headwayMin={routeInfo.headwayMin}
          />

          {/* Features */}
          {routeInfo.features.length > 0 && (
            <FeaturesRow features={routeInfo.features} color={modeColor} />
          )}

          {/* Tab Switcher */}
          <TabSwitcher
            activeTab={activeTab}
            onTabChange={handleTabChange}
            stopCount={stops.length}
            vehicleCount={vehicles.length}
            color={modeColor}
          />
        </View>
      );
    },
    [routeInfo, modeColor, fareInfo, activeTab, handleTabChange, stops.length, vehicles.length],
  );

  // ── Render: Stops tab ────────────────────────────────────────────────
  const renderStopItem = useCallback(
    ({ item, index }: { item: RouteStop; index: number }) => (
      <StopRow
        stop={item}
        index={index}
        total={stops.length}
        color={modeColor}
        onPress={handleStopPress}
      />
    ),
    [stops.length, modeColor, handleStopPress],
  );

  const keyExtractor = useCallback((item: RouteStop | LiveVehicle, index: number) => "id" in item ? item.id : `v-${index}`, []);

  // ── Render: Vehicles tab ──────────────────────────────────────────────
  const renderVehicleItem = useCallback(
    ({ item }: { item: LiveVehicle }) => (
      <VehicleCard vehicle={item} color={modeColor} />
    ),
    [modeColor],
  );

  // ── Decide which FlatList config to use ───────────────────────────────
  const isStopsTab = activeTab === "stops";
  const data = isStopsTab ? stops : vehicles;
  const renderItem = isStopsTab ? renderStopItem : renderVehicleItem;
  const emptyComponent = useCallback(
    () => <EmptyState tab={activeTab} isVehicles={!isStopsTab} />,
    [activeTab, isStopsTab],
  );

  // ── Loading / Error gates ─────────────────────────────────────────────
  if (isLoading) {
    return (
      <ErrorBoundary>
        <View style={main.container}>
          <LoadingSkeleton />
        </View>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <View style={main.container}>
          <ErrorState message={error} onRetry={onRefresh} />
        </View>
      </ErrorBoundary>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <View style={main.container}>
        <FlatList
          data={data as any}
          keyExtractor={keyExtractor}
          renderItem={renderItem as any}
          ListHeaderComponent={listHeader}
          ListEmptyComponent={emptyComponent}
          contentContainerStyle={main.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={modeColor}
              colors={[modeColor]}
            />
          }
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={7}
          removeClippedSubviews={Platform.OS !== "web"}
        />
      </View>
    </ErrorBoundary>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const main = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface_2 },
  listContent: { paddingBottom: spacing[12] },
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
});

export default RouteDetailScreen;
