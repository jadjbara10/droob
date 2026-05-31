// ============================================================================
// دروب (Droob) — Stop Detail Screen (تفاصيل المحطة)
// Redesigned: stop header (icon, name, code, distance), amenities row,
// action buttons (save, alert, report), live departure board with countdown
// timers, loading skeleton, empty state, error state, RTL Arabic.
// ============================================================================

import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  type ViewStyle,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import type { RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import type { RootStackParamList } from "@/navigation/AppNavigator";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import {
  colors,
  transitColorMap,
  radius,
  spacing,
  fontSize,
  fontWeight,
  shadows,
  layout,
} from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { OccupancyLevel } from "@/types/transit";
import type { Departure, TransportMode } from "@/types/transit.types";
import { OccupancyIndicator } from "@components/OccupancyIndicator";
import { ErrorBoundary } from "@components/ErrorBoundary";

// ═══════════════════════════════════════════════════════════════════════════════
//  CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

const COUNTDOWN_INTERVAL_MS = 30_000; // refresh countdown every 30s
const SIMULATED_FETCH_MS = 800;       // mock network delay for pull-to-refresh

const AMMENITIES = [
  { key: "hasAccessibility", icon: "wheelchair-accessibility", label: "ذوي الاحتياجات" },
  { key: "hasShelter", icon: "bus-stop-covered", label: "مظلة" },
  { key: "hasLighting", icon: "lightbulb-on-outline", label: "إضاءة" },
  { key: "hasTicketMachine", icon: "ticket-outline", label: "تذاكر" },
  { key: "hasAc", icon: "snowflake", label: "تكييف" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
//  LOCAL TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface StopDetail {
  id: string;
  code: string;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
  distanceM: number;
  hasAccessibility: boolean;
  hasShelter: boolean;
  hasLighting: boolean;
  hasTicketMachine: boolean;
  hasAc: boolean;
}

interface StopDeparture {
  routeId: string;
  code: string;
  nameAr: string;
  nameEn: string;
  mode: TransportMode;
  color: string;
  waitMinutes: number;
  occupancy: OccupancyLevel;
  status: "on_time" | "delayed" | "cancelled";
  fare: number | { min: number; max: number };
  tripId?: string;
}

type LoadState = "loading" | "loaded" | "error";

// ═══════════════════════════════════════════════════════════════════════════════
//  MOCK DATA
// ═══════════════════════════════════════════════════════════════════════════════

const MOCK_STOP: StopDetail = {
  id: "stop-004",
  code: "AMM-4TH-004",
  nameAr: "دوار الداخلية",
  nameEn: "Interior Circle",
  lat: 31.958,
  lng: 35.912,
  distanceM: 120,
  hasAccessibility: true,
  hasShelter: true,
  hasLighting: true,
  hasTicketMachine: false,
  hasAc: false,
};

const MOCK_DEPARTURES: StopDeparture[] = [
  { routeId: "BRT1", code: "BRT1", nameAr: "صويلح", nameEn: "Sweileh", mode: "brt", color: transitColorMap.brt, waitMinutes: 3,  occupancy: "partial", status: "on_time",   fare: 0.5 },
  { routeId: "2",    code: "2",    nameAr: "المطار", nameEn: "Airport",  mode: "city_bus", color: transitColorMap.city_bus, waitMinutes: 8,  occupancy: "full",    status: "delayed",  fare: 0.35 },
  { routeId: "BRT1", code: "BRT1", nameAr: "صويلح", nameEn: "Sweileh",  mode: "brt", color: transitColorMap.brt, waitMinutes: 15, occupancy: "empty",   status: "on_time",   fare: 0.5 },
  { routeId: "23",   code: "23",   nameAr: "الزرقاء", nameEn: "Zarqa",  mode: "city_bus", color: transitColorMap.city_bus, waitMinutes: 22, occupancy: "partial", status: "on_time",   fare: 0.35 },
  { routeId: "SERV-SW", code: "س-ص", nameAr: "صويلح", nameEn: "Sweileh", mode: "serveece", color: transitColorMap.serveece, waitMinutes: 5,  occupancy: "empty",   status: "on_time",   fare: { min: 0.3, max: 0.4 } },
];

// ═══════════════════════════════════════════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

const MODE_LABELS: Record<TransportMode, string> = {
  city_bus: "باص مدني",
  brt: "باص سريع",
  serveece: "سرفيس",
  intercity: "بين المدن",
};

const STATUS_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  on_time:  { label: "في الموعد", icon: "check-circle",       color: colors.on_time },
  delayed:  { label: "متأخر",     icon: "clock-alert-outline", color: colors.delayed },
  cancelled:{ label: "ملغي",      icon: "close-circle",        color: colors.cancelled },
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} م`;
  return `${(meters / 1000).toFixed(1)} كم`;
}

function formatFare(fare: number | { min: number; max: number }): string {
  if (typeof fare === "number") return `${fare.toFixed(2)} د.أ`;
  return `${fare.min.toFixed(2)} - ${fare.max.toFixed(2)} د.أ`;
}

function formatCountdown(minutes: number): string {
  if (minutes <= 0) return "الحقها";
  if (minutes < 2)  return `${minutes} دقيقة`;
  return `${minutes} دقائق`;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SKELETON LOADER
// ═══════════════════════════════════════════════════════════════════════════════

function SkeletonBlock({ width, height, style }: { width: number; height: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: colors.surface_3,
        },
        style,
      ]}
    />
  );
}

function LoadingSkeleton() {
  return (
    <View style={skeletonStyles.container}>
      {/* Stop card skeleton */}
      <View style={skeletonStyles.card}>
        <View style={{ flexDirection: "row", gap: spacing[3], alignItems: "center" }}>
          <SkeletonBlock width={50} height={50} style={{ borderRadius: radius.lg }} />
          <View style={{ flex: 1, gap: spacing[1] }}>
            <SkeletonBlock width={140} height={20} />
            <SkeletonBlock width={100} height={14} />
            <SkeletonBlock width={80} height={12} />
          </View>
        </View>
        <View style={{ flexDirection: "row", justifyContent: "space-around", marginTop: spacing[4], paddingTop: spacing[3], borderTopWidth: 1, borderTopColor: colors.border }}>
          {[...Array(5)].map((_, i) => (
            <View key={i} style={{ alignItems: "center", gap: spacing[1] }}>
              <SkeletonBlock width={22} height={22} style={{ borderRadius: radius.full }} />
              <SkeletonBlock width={40} height={10} />
            </View>
          ))}
        </View>
      </View>
      {/* Action buttons skeleton */}
      <View style={{ flexDirection: "row", paddingHorizontal: spacing[4], gap: spacing[2], marginBottom: spacing[2] }}>
        {[...Array(3)].map((_, i) => (
          <SkeletonBlock key={i} width={0} height={44} style={{ flex: 1, borderRadius: radius.card }} />
        ))}
      </View>
      {/* Section header skeleton */}
      <View style={{ paddingHorizontal: spacing[4], marginBottom: spacing[2] }}>
        <SkeletonBlock width={180} height={18} />
      </View>
      {/* Departure rows skeleton */}
      {[...Array(4)].map((_, i) => (
        <View key={i} style={skeletonStyles.row}>
          <SkeletonBlock width={44} height={44} style={{ borderRadius: radius.card }} />
          <View style={{ flex: 1, gap: spacing[1] }}>
            <SkeletonBlock width={120} height={16} />
            <SkeletonBlock width={90} height={12} />
          </View>
          <SkeletonBlock width={60} height={30} style={{ borderRadius: radius.md }} />
        </View>
      ))}
    </View>
  );
}

const skeletonStyles = StyleSheet.create({
  container: { flex: 1, paddingTop: spacing[2] },
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    borderRadius: radius.xl,
    padding: spacing[4],
    ...shadows.sm,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radius.card,
    padding: spacing[3],
    ...shadows.sm,
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  ERROR VIEW
// ═══════════════════════════════════════════════════════════════════════════════

function ErrorView({ onRetry }: { onRetry: () => void }) {
  return (
    <View style={errorStyles.container}>
      <MaterialCommunityIcons name="bus-alert" size={56} color={colors.text_tertiary} />
      <Text style={errorStyles.title}>تعذر تحميل بيانات المحطة</Text>
      <Text style={errorStyles.subtitle}>تأكد من اتصالك بالإنترنت وحاول مرة أخرى</Text>
      <TouchableOpacity style={errorStyles.retryBtn} onPress={onRetry} activeOpacity={0.8}>
        <MaterialCommunityIcons name="refresh" size={18} color={colors.white} />
        <Text style={errorStyles.retryText}>إعادة المحاولة</Text>
      </TouchableOpacity>
    </View>
  );
}

const errorStyles = StyleSheet.create({
  container: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing[8], gap: spacing[2] },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary, textAlign: "center" },
  subtitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, textAlign: "center", lineHeight: 22, marginBottom: spacing[2] },
  retryBtn: { flexDirection: "row", alignItems: "center", gap: spacing[2], backgroundColor: colors.brand_blue, borderRadius: radius.pill, paddingHorizontal: spacing[6], paddingVertical: spacing[3] },
  retryText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.bold, color: colors.white },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

type StopDetailRouteProp = RouteProp<RootStackParamList, "StopDetail">;
type StopDetailNavProp = NativeStackNavigationProp<RootStackParamList, "StopDetail">;

function StopDetailContent() {
  const route = useRoute<StopDetailRouteProp>();
  const navigation = useNavigation<StopDetailNavProp>();
  const { stopId, stopName } = route.params;

  // ─── State ───────────────────────────────────────────────────────────────

  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [refreshing, setRefreshing] = useState(false);
  const [stopDetail, setStopDetail] = useState<StopDetail | null>(null);
  const [departures, setDepartures] = useState<StopDeparture[]>([]);
  const [saved, setSaved] = useState(false);
  const [alertsEnabled, setAlertsEnabled] = useState(false);
  const [now, setNow] = useState(Date.now());

  // ─── Countdown Timer ─────────────────────────────────────────────────────

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    timerRef.current = setInterval(() => setNow(Date.now()), COUNTDOWN_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // ─── Data Fetching ───────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoadState("loading");
    try {
      // Simulate API call
      await new Promise((r) => setTimeout(r, SIMULATED_FETCH_MS));
      setStopDetail(MOCK_STOP);
      setDepartures(MOCK_DEPARTURES);
      setLoadState("loaded");
    } catch {
      setLoadState("error");
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  // ─── Derived countdown values ────────────────────────────────────────────

  const departuresWithCountdown = useMemo(
    () =>
      departures.map((d) => ({
        ...d,
        displayMinutes: Math.max(0, d.waitMinutes - Math.floor((Date.now() - now) / 60_000)),
      })),
    [departures, now],
  );

  // ─── Handlers ────────────────────────────────────────────────────────────

  const toggleSave = useCallback(() => setSaved((p) => !p), []);
  const toggleAlert = useCallback(() => setAlertsEnabled((p) => !p), []);

  const navigateToRouteDetail = useCallback(
    (dep: StopDeparture) => {
      navigation.navigate("RouteDetail", { routeId: dep.routeId, routeName: dep.nameAr });
    },
    [navigation],
  );

  const navigateToCommunity = useCallback(() => {
    navigation.navigate("Community");
  }, [navigation]);

  // ─── Render: Departure Row ──────────────────────────────────────────────

  const renderDeparture = useCallback(
    ({ item }: { item: StopDeparture & { displayMinutes: number } }) => {
      const statusCfg = STATUS_CONFIG[item.status];
      return (
        <TouchableOpacity
          style={depStyles.card}
          activeOpacity={0.7}
          onPress={() => navigateToRouteDetail(item)}
          accessibilityRole="button"
          accessibilityLabel={`الخط ${item.code} إلى ${item.nameAr}`}
        >
          {/* Line badge */}
          <View style={[depStyles.badge, { backgroundColor: item.color }]}>
            <Text style={depStyles.badgeText} numberOfLines={1}>
              {item.code}
            </Text>
          </View>

          {/* Destination + meta */}
          <View style={depStyles.info}>
            <Text style={depStyles.destination} numberOfLines={1}>
              {item.nameAr}
            </Text>
            <Text style={depStyles.modeLabel}>{MODE_LABELS[item.mode]}</Text>
            <Text style={depStyles.fare}>{formatFare(item.fare)}</Text>
          </View>

          {/* Countdown + occupancy + status */}
          <View style={depStyles.rightCol}>
            <View
              style={[
                depStyles.countdownPill,
                item.displayMinutes <= 2 && { backgroundColor: colors.on_time + "18" },
                item.displayMinutes <= 0 && { backgroundColor: colors.cancelled + "18" },
              ]}
            >
              <Text
                style={[
                  depStyles.countdownText,
                  item.displayMinutes <= 2 && { color: colors.on_time, fontWeight: fontWeight.bold },
                  item.displayMinutes <= 0 && { color: colors.cancelled },
                ]}
              >
                {formatCountdown(item.displayMinutes)}
              </Text>
            </View>

            {/* Occupancy */}
            <OccupancyIndicator level={item.occupancy} showLabel={false} size="sm" />

            {/* Status badge (delayed/cancelled only) */}
            {item.status !== "on_time" && (
              <View style={[depStyles.statusBadge, { backgroundColor: statusCfg.color + "18" }]}>
                <MaterialCommunityIcons name={statusCfg.icon as any} size={10} color={statusCfg.color} />
                <Text style={[depStyles.statusLabel, { color: statusCfg.color }]}>{statusCfg.label}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      );
    },
    [navigateToRouteDetail],
  );

  // ─── Render: Stop Header ────────────────────────────────────────────────

  const renderHeader = useCallback(() => {
    if (!stopDetail) return null;
    return (
      <View>
        {/* Stop Info Card */}
        <View style={headerStyles.card}>
          <View style={headerStyles.topRow}>
            <View style={headerStyles.iconBox}>
              <MaterialCommunityIcons name="bus-stop-covered" size={28} color={colors.brand_blue} />
            </View>
            <View style={headerStyles.titleArea}>
              <Text style={headerStyles.nameAr}>{stopDetail.nameAr}</Text>
              <Text style={headerStyles.nameEn}>{stopDetail.nameEn}</Text>
              <View style={headerStyles.metaRow}>
                <View style={headerStyles.codeChip}>
                  <Text style={headerStyles.codeText}>{stopDetail.code}</Text>
                </View>
                <View style={headerStyles.distanceChip}>
                  <MaterialCommunityIcons name="map-marker-distance" size={12} color={colors.text_secondary} />
                  <Text style={headerStyles.distanceText}>{formatDistance(stopDetail.distanceM)}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Amenities */}
          <View style={headerStyles.amenitiesRow}>
            {AMMENITIES.map((a) => {
              const active = stopDetail[a.key as keyof typeof stopDetail] as boolean;
              return (
                <View key={a.key} style={headerStyles.amenityItem}>
                  <View
                    style={[
                      headerStyles.amenityIconWrap,
                      { backgroundColor: active ? colors.on_time + "15" : colors.surface_3 },
                    ]}
                  >
                    <MaterialCommunityIcons
                      name={a.icon as any}
                      size={16}
                      color={active ? colors.on_time : colors.text_tertiary}
                    />
                  </View>
                  <Text
                    style={[
                      headerStyles.amenityLabel,
                      !active && { color: colors.text_tertiary },
                    ]}
                    numberOfLines={1}
                  >
                    {a.label}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Action Buttons */}
        <View style={headerStyles.actionsRow}>
          {/* Save stop */}
          <TouchableOpacity
            style={[headerStyles.actionBtn, saved && headerStyles.actionBtnActive]}
            onPress={toggleSave}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={saved ? "إزالة من المحفوظات" : "حفظ المحطة"}
          >
            <MaterialCommunityIcons
              name={saved ? "star" : "star-outline"}
              size={18}
              color={saved ? colors.gold_accent : colors.brand_blue}
            />
            <Text style={[headerStyles.actionText, saved && { color: colors.gold_accent }]}>
              {saved ? "محفوظة" : "حفظ"}
            </Text>
          </TouchableOpacity>

          {/* Set alert */}
          <TouchableOpacity
            style={[headerStyles.actionBtn, alertsEnabled && headerStyles.actionBtnActive]}
            onPress={toggleAlert}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={alertsEnabled ? "إلغاء التنبيه" : "تفعيل التنبيه"}
          >
            <MaterialCommunityIcons
              name={alertsEnabled ? "bell-ring" : "bell-outline"}
              size={18}
              color={alertsEnabled ? colors.gold_accent : colors.brand_blue}
            />
            <Text style={[headerStyles.actionText, alertsEnabled && { color: colors.gold_accent }]}>
              {alertsEnabled ? "مفعل" : "تنبيه"}
            </Text>
          </TouchableOpacity>

          {/* Report issue */}
          <TouchableOpacity
            style={headerStyles.actionBtn}
            onPress={navigateToCommunity}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="الإبلاغ عن مشكلة"
          >
            <MaterialCommunityIcons name="flag-outline" size={18} color={colors.brand_blue} />
            <Text style={headerStyles.actionText}>بلاغ</Text>
          </TouchableOpacity>
        </View>

        {/* Section Header */}
        <View style={headerStyles.sectionHeader}>
          <Text style={headerStyles.sectionTitle}>المغادرات القادمة</Text>
          <Text style={headerStyles.sectionSubtext}>{departures.length} رحلة</Text>
        </View>
      </View>
    );
  }, [stopDetail, saved, alertsEnabled, departures.length, toggleSave, toggleAlert, navigateToCommunity]);

  // ─── Render: List Empty ──────────────────────────────────────────────────

  const renderEmpty = useCallback(
    () =>
      loadState === "loaded" ? (
        <View style={emptyStyles.container}>
          <MaterialCommunityIcons name="bus-clock" size={48} color={colors.text_tertiary} />
          <Text style={emptyStyles.title}>لا توجد رحلات قادمة</Text>
          <Text style={emptyStyles.subtitle}>قد تكون المحطة خارج أوقات الخدمة</Text>
        </View>
      ) : null,
    [loadState],
  );

  // ─── Render ─────────────────────────────────────────────────────────────

  if (loadState === "loading" && !stopDetail) return <LoadingSkeleton />;
  if (loadState === "error") return <ErrorView onRetry={fetchData} />;

  return (
    <FlatList
      data={departuresWithCountdown}
      keyExtractor={(item, idx) => `${item.routeId}-${item.waitMinutes}-${idx}`}
      renderItem={renderDeparture}
      contentContainerStyle={listStyles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand_blue}
          colors={[colors.brand_blue]}
        />
      }
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={renderEmpty}
      ListFooterComponent={
        departures.length > 0 ? (
          <View style={listStyles.footer}>
            <MaterialCommunityIcons name="refresh-auto" size={14} color={colors.text_tertiary} />
            <Text style={listStyles.footerText}>تحديث تلقائي كل ٣٠ ثانية</Text>
          </View>
        ) : null
      }
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const listStyles = StyleSheet.create({
  content: {
    paddingBottom: spacing[8],
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    paddingVertical: spacing[4],
  },
  footerText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.text_tertiary,
  },
});

const headerStyles = StyleSheet.create({
  // ─── Stop Card ──────────────────────────────────────────────────────────
  card: {
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginTop: spacing[2],
    borderRadius: radius.xl,
    padding: spacing[4],
    ...shadows.md,
  },
  topRow: {
    flexDirection: "row",
    gap: spacing[3],
    alignItems: "flex-start",
  },
  iconBox: {
    width: layout.transitBadge.lg,
    height: layout.transitBadge.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.brand_blue + "12",
    alignItems: "center",
    justifyContent: "center",
  },
  titleArea: {
    flex: 1,
    gap: spacing[0],
  },
  nameAr: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[22],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
  },
  nameEn: {
    fontFamily: "IBM Plex Sans",
    fontSize: fontSize[13],
    color: colors.text_secondary,
    marginTop: spacing[0],
  },
  metaRow: {
    flexDirection: "row",
    gap: spacing[2],
    marginTop: spacing[2],
  },
  codeChip: {
    backgroundColor: colors.surface_2,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0],
  },
  codeText: {
    fontFamily: "IBM Plex Sans",
    fontSize: fontSize[11],
    fontWeight: fontWeight.semiBold,
    color: colors.text_secondary,
  },
  distanceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[0],
    backgroundColor: colors.surface_2,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0],
  },
  distanceText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    fontWeight: fontWeight.medium,
    color: colors.text_secondary,
  },

  // ─── Amenities ──────────────────────────────────────────────────────────
  amenitiesRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingTop: spacing[4],
    marginTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  amenityItem: {
    alignItems: "center",
    gap: spacing[1],
    maxWidth: 64,
  },
  amenityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  amenityLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    fontWeight: fontWeight.medium,
    color: colors.text_secondary,
  },

  // ─── Actions ────────────────────────────────────────────────────────────
  actionsRow: {
    flexDirection: "row",
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginTop: spacing[3],
    marginBottom: spacing[1],
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  actionBtnActive: {
    backgroundColor: colors.gold_accent + "10",
    borderColor: colors.gold_accent + "40",
  },
  actionText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.semiBold,
    color: colors.brand_blue,
  },

  // ─── Section ────────────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
    marginBottom: spacing[2],
  },
  sectionTitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[16],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
  },
  sectionSubtext: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.text_secondary,
  },
});

const depStyles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[3],
    backgroundColor: colors.surface,
    marginHorizontal: spacing[4],
    marginBottom: spacing[2],
    borderRadius: radius.card,
    padding: spacing[3],
    ...shadows.sm,
  },
  badge: {
    width: layout.transitBadge.md,
    height: layout.transitBadge.md,
    borderRadius: radius.card,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
  info: {
    flex: 1,
    gap: spacing[0],
  },
  destination: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.semiBold,
    color: colors.text_primary,
  },
  modeLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.text_secondary,
    marginTop: spacing[0],
  },
  fare: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.text_tertiary,
    marginTop: spacing[0],
  },
  rightCol: {
    alignItems: "flex-end",
    gap: spacing[1],
  },
  countdownPill: {
    backgroundColor: colors.surface_2,
    borderRadius: radius.md,
    paddingHorizontal: spacing[2],
    paddingVertical: spacing[0],
    minWidth: 48,
    alignItems: "center",
  },
  countdownText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.medium,
    color: colors.text_primary,
    textAlign: "center",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: spacing[1],
    paddingVertical: 1,
    borderRadius: radius.sm,
  },
  statusLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: 9,
    fontWeight: fontWeight.bold,
  },
});

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: spacing[12],
    paddingHorizontal: spacing[8],
    gap: spacing[2],
  },
  title: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[16],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    textAlign: "center",
  },
  subtitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    color: colors.text_secondary,
    textAlign: "center",
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
//  EXPORT (wrapped in ErrorBoundary)
// ═══════════════════════════════════════════════════════════════════════════════

export default function StopDetailScreen() {
  return (
    <ErrorBoundary>
      <StopDetailContent />
    </ErrorBoundary>
  );
}
