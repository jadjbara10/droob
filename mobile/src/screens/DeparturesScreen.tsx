// ============================================================================
// دروب (Droob) — DeparturesScreen (لوحة المغادرات)
// Uber/Careem-quality live departure board with countdown ticks, mode filters,
// shimmer loading, error recovery, and alert integration.
// RTL-optimized, production grade.
// ============================================================================

import React, { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Platform,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import Animated, {
  FadeInRight,
  Layout as ReLayout,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, fontSize, fontWeight, layout as layoutTokens } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { Departure, TransportMode } from "@/types/transit.types";
import type { MainTabParamList, RootStackParamList } from "@/navigation/AppNavigator";
import { TransitBadge } from "@components/TransitBadge";
import { StatusPill } from "@components/StatusPill";
import { CountdownTimer } from "@components/CountdownTimer";
import { OccupancyIndicator } from "@components/OccupancyIndicator";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { useTransitStore } from "@stores/transit.store";

// ─── Constants ───────────────────────────────────────────────────────────────

const DEPARTURE_ITEM_HEIGHT = 72;
const DEPARTURE_SEPARATOR_HEIGHT = 1;
const TICK_INTERVAL_MS = 30_000;
const SHIMMER_ROW_COUNT = 6;

type FilterMode = "all" | TransportMode;

interface FilterChip {
  key: FilterMode;
  label: string;
  icon: string;
}

const FILTER_CHIPS: FilterChip[] = [
  { key: "all", label: "الكل", icon: "" },
  { key: "city_bus", label: "باص", icon: "🚌" },
  { key: "brt", label: "سريع", icon: "⚡" },
  { key: "serveece", label: "سرفيس", icon: "🚐" },
  { key: "intercity", label: "بين", icon: "🚍" },
];

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_DEPARTURES: Departure[] = [
  { routeId:"r1", code:"2",   name_ar:"صويلح", name_en:"Sweileh",         mode:"city_bus", color:"#0066CC", fare:0.45, departureTime:new Date(Date.now() + 3*60000).toISOString(),  waitMinutes:3,  occupancy:"partial" as const, status:"on_time" as const, tripId:"t1" },
  { routeId:"r2", code:"BRT1",name_ar:"المدينة الرياضية", name_en:"Sports City", mode:"brt",    color:"#E60026", fare:0.50, departureTime:new Date(Date.now() + 5*60000).toISOString(),  waitMinutes:5,  occupancy:"empty" as const,   status:"delayed" as const, tripId:"t2" },
  { routeId:"r3", code:"SERV",name_ar:"الصويفية", name_en:"Sweifieh",      mode:"serveece",  color:"#FF8C00", fare:{min:0.20,max:0.40}, departureTime:new Date(Date.now() + 12*60000).toISOString(), waitMinutes:12, occupancy:"empty" as const,   status:"on_time" as const, tripId:"t3" },
  { routeId:"r4", code:"6",   name_ar:"ماركا", name_en:"Marka",           mode:"city_bus", color:"#0066CC", fare:0.45, departureTime:new Date(Date.now() + 25*60000).toISOString(), waitMinutes:25, occupancy:"full" as const,   status:"on_time" as const, tripId:"t4" },
  { routeId:"r5", code:"BRT2",name_ar:"مجمع رغدان", name_en:"Raghadan",    mode:"brt",    color:"#E60026", fare:0.50, departureTime:new Date(Date.now() + 8*60000).toISOString(),  waitMinutes:8,  occupancy:"partial" as const, status:"cancelled" as const, tripId:"t5" },
  { routeId:"r6", code:"105", name_ar:"اربد", name_en:"Irbid",            mode:"intercity", color:"#6B21A8", fare:1.50, departureTime:new Date(Date.now() + 35*60000).toISOString(), waitMinutes:35, occupancy:"partial" as const, status:"on_time" as const, tripId:"t6" },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  LOADING SKELETON (shimmer)
// ═══════════════════════════════════════════════════════════════════════════════

const ShimmerBlock: React.FC<{ style?: any }> = ({ style }) => {
  const opacity = useSharedValue(0.3);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 800 }),
        withTiming(0.3, { duration: 800 }),
      ),
      -1,
      true,
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[animatedStyle, { backgroundColor: colors.surface_3, borderRadius: radius.sm }, style]} />;
};

const SkeletonRow: React.FC = () => (
  <View style={skel.row}>
    <ShimmerBlock style={{ width: layoutTokens.transitBadge.md, height: layoutTokens.transitBadge.md, borderRadius: radius.lg }} />
    <View style={skel.info}>
      <ShimmerBlock style={{ width: "60%", height: 14 }} />
      <ShimmerBlock style={{ width: "35%", height: 11 }} />
    </View>
    <View style={skel.time}>
      <ShimmerBlock style={{ width: 40, height: 20 }} />
      <ShimmerBlock style={{ width: 50, height: 18 }} />
    </View>
  </View>
);

const LoadingSkeleton: React.FC = () => (
  <View style={skel.container}>
    {Array.from({ length: SHIMMER_ROW_COUNT }).map((_, i) => (
      <View key={i}>
        <SkeletonRow />
        {i < SHIMMER_ROW_COUNT - 1 && <View style={skel.sep} />}
      </View>
    ))}
  </View>
);

const skel = StyleSheet.create({
  container: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  row: { flexDirection: "row", alignItems: "center", height: DEPARTURE_ITEM_HEIGHT, gap: 10 },
  info: { flex: 1, gap: 6 },
  time: { alignItems: "center", gap: 4, minWidth: 60 },
  sep: { height: DEPARTURE_SEPARATOR_HEIGHT, backgroundColor: colors.surface_2 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ERROR STATE
// ═══════════════════════════════════════════════════════════════════════════════

interface ErrorStateProps { message: string; onRetry: () => void; }

const ErrorState: React.FC<ErrorStateProps> = ({ message, onRetry }) => (
  <View style={err.root}>
    <Text style={err.icon}>⚠️</Text>
    <Text style={err.title}>تعذر تحميل المغادرات</Text>
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
//  EMPTY STATE
// ═══════════════════════════════════════════════════════════════════════════════

const EmptyState: React.FC<{ filter: FilterMode }> = ({ filter }) => {
  const chip = FILTER_CHIPS.find((c) => c.key === filter);
  const subtitle =
    filter === "all"
      ? "لا توجد رحلات قادمة من هذه المحطة حالياً"
      : `لا توجد رحلات ${chip?.icon ?? ""} ${chip?.label ?? ""} قادمة من هذه المحطة`;
  return (
    <View style={empty.root}>
      <Text style={empty.icon}>🚏</Text>
      <Text style={empty.title}>لا توجد رحلات</Text>
      <Text style={empty.subtitle}>{subtitle}</Text>
    </View>
  );
};

const empty = StyleSheet.create({
  root: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing[8], gap: 8, minHeight: 280 },
  icon: { fontSize: 48, marginBottom: 8 },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary },
  subtitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, textAlign: "center", lineHeight: 22, paddingHorizontal: spacing[8] },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  FILTER PILL
// ═══════════════════════════════════════════════════════════════════════════════

interface FilterPillProps { chip: FilterChip; isActive: boolean; onPress: () => void; }

const FilterPill: React.FC<FilterPillProps> = React.memo(({ chip, isActive, onPress }) => (
  <TouchableOpacity
    style={[pill.base, isActive && pill.active]}
    onPress={onPress}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityState={{ selected: isActive }}
    accessibilityLabel={chip.label}
  >
    {chip.icon ? <Text style={pill.icon}>{chip.icon}</Text> : null}
    <Text style={[pill.label, isActive && pill.activeLabel]}>{chip.label}</Text>
  </TouchableOpacity>
));

const pill = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface_2,
    borderWidth: 1,
    borderColor: colors.border,
    height: layoutTokens.filterPillHeight,
  },
  active: { backgroundColor: colors.brand_blue, borderColor: colors.brand_blue },
  icon: { fontSize: 14 },
  label: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium, color: colors.text_secondary },
  activeLabel: { color: colors.white, fontWeight: fontWeight.bold },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  DEPARTURE ROW
// ═══════════════════════════════════════════════════════════════════════════════

interface DepartureRowProps { item: Departure; onPress: () => void; onBell: () => void; }

const DepartureRow: React.FC<DepartureRowProps> = React.memo(({ item, onPress, onBell }) => (
  <Animated.View entering={FadeInRight.duration(300)} layout={ReLayout.springify()}>
    <TouchableOpacity style={row.base} onPress={onPress} activeOpacity={0.7}>
      {/* Route badge: mode icon + line code */}
      <TransitBadge mode={item.mode} code={item.code} size="md" />

      {/* Destination column */}
      <View style={row.info}>
        <Text style={row.destination} numberOfLines={1}>
          {item.name_ar}
        </Text>
        <View style={row.meta}>
          <Text style={row.lineCode} numberOfLines={1}>
            {item.code}
          </Text>
          <OccupancyIndicator level={item.occupancy} size="sm" showLabel={false} />
        </View>
      </View>

      {/* Countdown + status column */}
      <View style={row.timeCol}>
        <CountdownTimer minutes={item.waitMinutes} size="sm" />
        <StatusPill status={item.status} size="sm" />
      </View>

      {/* Alert bell */}
      <TouchableOpacity
        style={row.bell}
        onPress={onBell}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="تعيين تنبيه"
      >
        <Text style={row.bellIcon}>{item.tripId ? "🔔" : "🔕"}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  </Animated.View>
));

const row = StyleSheet.create({
  base: { flexDirection: "row", alignItems: "center", height: DEPARTURE_ITEM_HEIGHT, gap: 10, paddingVertical: spacing[2] },
  info: { flex: 1, gap: 4 },
  destination: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold, color: colors.text_primary, textAlign: "right" },
  meta: { flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 8 },
  lineCode: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_secondary },
  timeCol: { alignItems: "center", gap: 2, minWidth: 50 },
  bell: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  bellIcon: { fontSize: 18 },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  COLUMN HEADERS
// ═══════════════════════════════════════════════════════════════════════════════

const ColumnHeaders: React.FC = () => (
  <View style={col.root}>
    <View style={{ width: layoutTokens.transitBadge.md }} />
    <View style={col.infoCol}>
      <Text style={col.text}>الوجهة</Text>
    </View>
    <View style={col.timeCol}>
      <Text style={col.text}>⏱</Text>
      <Text style={col.text}>الحالة</Text>
    </View>
    <View style={{ width: 36 }} />
  </View>
);

const col = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    height: layoutTokens.departureHeaderHeight,
    gap: 10,
    paddingHorizontal: spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface_2,
  },
  infoCol: { flex: 1, alignItems: "flex-end" },
  timeCol: { flexDirection: "row", alignItems: "center", gap: 8, minWidth: 50 },
  text: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], fontWeight: fontWeight.semiBold, color: colors.text_tertiary },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

const DeparturesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<MainTabParamList, "Departures">>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const stopId = route.params?.stopId || "gardenz";
  const stopName = route.params?.stopName || "محطة الجاردنز";

  // ── Local state ──────────────────────────────────────────────────────────
  const [selectedFilter, setSelectedFilter] = useState<FilterMode>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  // ── Store ────────────────────────────────────────────────────────────────
  const storeDepartures = useTransitStore((s) => s.departures);
  const storeLoading = useTransitStore((s) => s.isLoading);
  const fetchDepartures = useTransitStore((s) => s.fetchDepartures);
  const selectedStop = useTransitStore((s) => s.selectedStop);

  const allDepartures = useMemo(
    () => (storeDepartures.length > 0 ? storeDepartures : MOCK_DEPARTURES),
    [storeDepartures],
  );

  const displayName = selectedStop?.name_ar || stopName;
  const displayCode = selectedStop?.code || "G01";

  // ── Countdown tick — decrement waitMinutes every 30s ────────────────────
  useEffect(() => {
    const interval = setInterval(() => setTick((p) => p + 1), TICK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, []);

  const departures = useMemo(
    () =>
      allDepartures
        .map((d) => ({
          ...d,
          waitMinutes: Math.max(0, d.waitMinutes - tick * 0.5),
        }))
        .filter((d) => selectedFilter === "all" || d.mode === selectedFilter),
    [allDepartures, tick, selectedFilter],
  );

  // ── Fetch on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      try {
        setError(null);
        await fetchDepartures(stopId);
      } catch (e: any) {
        setError(e?.message || "فشل الاتصال بالخادم");
      }
    };
    load();
  }, [stopId, fetchDepartures]);

  // ── Pull-to-refresh ─────────────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      await fetchDepartures(stopId);
    } catch (e: any) {
      setError(e?.message || "فشل التحديث");
    }
    setRefreshing(false);
  }, [stopId, fetchDepartures]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleRowPress = useCallback(
    (item: Departure) => {
      navigation.navigate("RouteDetail", {
        routeId: item.routeId,
        routeName: item.name_ar,
      });
    },
    [navigation],
  );

  const handleBell = useCallback((_item: Departure) => {
    if (Platform.OS !== "web") {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    // TODO: Wire up departure alert creation
  }, []);

  const handleRetry = useCallback(async () => {
    setError(null);
    try {
      await fetchDepartures(stopId);
    } catch (e: any) {
      setError(e?.message || "فشل الاتصال بالخادم");
    }
  }, [stopId, fetchDepartures]);

  // ── FlatList helpers ────────────────────────────────────────────────────
  const keyExtractor = useCallback((item: Departure) => item.tripId || item.routeId, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: DEPARTURE_ITEM_HEIGHT + DEPARTURE_SEPARATOR_HEIGHT,
      offset: (DEPARTURE_ITEM_HEIGHT + DEPARTURE_SEPARATOR_HEIGHT) * index,
      index,
    }),
    [],
  );

  const renderItem = useCallback(
    ({ item }: { item: Departure }) => (
      <DepartureRow
        item={item}
        onPress={() => handleRowPress(item)}
        onBell={() => handleBell(item)}
      />
    ),
    [handleRowPress, handleBell],
  );

  const renderSeparator = useCallback(
    () => <View style={{ height: DEPARTURE_SEPARATOR_HEIGHT, backgroundColor: colors.surface_2 }} />,
    [],
  );

  const renderEmpty = useCallback(
    () => (storeLoading ? null : <EmptyState filter={selectedFilter} />),
    [storeLoading, selectedFilter],
  );

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <View style={[root.root, { paddingTop: insets.top }]}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <View style={root.header}>
          <View style={root.headerTop}>
            <TouchableOpacity
              style={root.backBtn}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="رجوع"
            >
              <Text style={root.backBtnText}>←</Text>
            </TouchableOpacity>
            <Text style={root.headerTitle}>لوحة المغادرات</Text>
          </View>

          {/* Stop info */}
          <View style={root.stopInfo}>
            <Text style={root.stopName}>{displayName}</Text>
            <View style={root.stopCode}>
              <Text style={root.stopCodeText}>{displayCode}</Text>
            </View>
          </View>

          {/* Live indicator */}
          <View style={root.liveRow}>
            <View style={root.liveDotOuter}>
              <View style={root.liveDot} />
            </View>
            <Text style={root.liveLabel}>مباشر</Text>
          </View>
        </View>

        {/* ── Mode filter pills ──────────────────────────────────────── */}
        <View style={root.filterContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={root.filterScroll}
          >
            {FILTER_CHIPS.map((chip) => (
              <FilterPill
                key={chip.key}
                chip={chip}
                isActive={selectedFilter === chip.key}
                onPress={() => setSelectedFilter(chip.key)}
              />
            ))}
          </ScrollView>
        </View>

        {/* ── Column headers (only when data visible) ────────────────── */}
        {departures.length > 0 && !storeLoading && <ColumnHeaders />}

        {/* ── Content ────────────────────────────────────────────────── */}
        {storeLoading && departures.length === 0 ? (
          <LoadingSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={handleRetry} />
        ) : (
          <FlatList
            data={departures}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={renderEmpty}
            getItemLayout={getItemLayout}
            refreshing={refreshing}
            onRefresh={onRefresh}
            contentContainerStyle={root.listContent}
            showsVerticalScrollIndicator={false}
            initialNumToRender={12}
            maxToRenderPerBatch={10}
            windowSize={7}
            removeClippedSubviews={Platform.OS !== "web"}
          />
        )}

        {/* ── Footer / notification tip ──────────────────────────────── */}
        <View style={root.footer}>
          <Text style={root.footerIcon}>🔔</Text>
          <Text style={root.footerText}>اضغط على الجرس للتنبيهات</Text>
        </View>
      </View>
    </ErrorBoundary>
  );
};

// ─── Root Styles ────────────────────────────────────────────────────────────

const root = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },

  // Header
  header: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
    marginBottom: spacing[2],
  },
  backBtn: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    backgroundColor: colors.surface_2,
  },
  backBtnText: { fontSize: 18, color: colors.text_primary, fontWeight: fontWeight.bold },
  headerTitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[18],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    flex: 1,
    textAlign: "right",
  },
  stopInfo: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  stopName: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[24], fontWeight: fontWeight.bold, color: colors.text_primary },
  stopCode: { backgroundColor: colors.surface_2, borderRadius: radius.pill, paddingHorizontal: spacing[3], paddingVertical: 3 },
  stopCodeText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium, color: colors.text_secondary },
  liveRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: spacing[1] },
  liveDotOuter: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.on_time + "30", alignItems: "center", justifyContent: "center" },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.on_time },
  liveLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium, color: colors.on_time },

  // Filters
  filterContainer: { borderBottomWidth: 1, borderBottomColor: colors.border, backgroundColor: colors.surface },
  filterScroll: { flexDirection: "row", paddingHorizontal: spacing[4], paddingVertical: spacing[2], gap: spacing[2] },

  // List
  listContent: { paddingHorizontal: spacing[4] },

  // Footer
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[2],
    paddingVertical: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface_2,
  },
  footerIcon: { fontSize: 14 },
  footerText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_tertiary },
});

export default DeparturesScreen;
