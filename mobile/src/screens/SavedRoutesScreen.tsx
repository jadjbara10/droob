// ============================================================================
// دروب (Droob) — SavedRoutesScreen (المحفوظات)
// Shows bookmarked routes & stops with store integration
// ============================================================================

import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { TransitBadge } from "@components/TransitBadge";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import { useTransitStore } from "@stores/transit.store";
import type { TransitStop, TransitRoute } from "@/types/transit.types";
import { TRANSPORT_MODES } from "../config/transport.config";

type TabKey = "routes" | "stops";

// ─── Mock Data (until persistent storage is wired) ─────────────────────────
const MOCK_SAVED_ROUTES: Array<TransitRoute & { savedAt: string }> = [
  { id:"r1", code:"BRT1", name_ar:"الباص السريع 1", name_en:"BRT Line 1", mode:"brt", color:"#E60026", agencyId:"a1", originStopId:"s1", destinationStopId:"s5", originName_ar:"صويلح", destinationName_ar:"وسط البلد", governorate:"عمان", distance_km:14, duration_min:35, fare_jod:0.50, isActive:true, hasFridaySchedule:true, hasRamadanSchedule:false, headway_min:8, vehicleType:"bus", polyline:[], createdAt:"2026-01-01", updatedAt:"2026-05-01", savedAt:"2026-05-29" },
  { id:"r2", code:"2", name_ar:"خط 2", name_en:"Line 2", mode:"city_bus", color:"#0066CC", agencyId:"a2", originStopId:"s10", destinationStopId:"s15", originName_ar:"الجاردنز", destinationName_ar:"الجامعة", governorate:"عمان", distance_km:8, duration_min:22, fare_jod:0.40, isActive:true, hasFridaySchedule:false, hasRamadanSchedule:false, headway_min:15, vehicleType:"bus", polyline:[], createdAt:"2026-01-01", updatedAt:"2026-05-01", savedAt:"2026-05-28" },
  { id:"r3", code:"SERV-ABD", name_ar:"سرفيس العبدلي", name_en:"Abdali Serveece", mode:"serveece", color:"#FF8C00", agencyId:"a3", originStopId:"s20", destinationStopId:"s25", originName_ar:"العبدلي", destinationName_ar:"الصويفية", governorate:"عمان", distance_km:6, duration_min:18, fare_jod:0.30, isActive:true, hasFridaySchedule:false, hasRamadanSchedule:true, headway_min:null, vehicleType:"minibus", polyline:[], createdAt:"2026-01-01", updatedAt:"2026-03-01", savedAt:"2026-05-27" },
];

const MOCK_SAVED_STOPS: Array<TransitStop & { savedAt: string }> = [
  { id:"ps1", code:"AMM-UJ", name_ar:"الجامعة الأردنية", name_en:"U of Jordan", lat:32.0156, lng:35.8747, governorate:"عمان", city:"عمان", isTerminal:false, hasShelter:true, hasLighting:true, hasAccessibility:true, hasTicketMachine:false, hasAc:false, photoUrl:null, parentStationId:null, createdAt:"2026-01-01", updatedAt:"2026-01-01", savedAt:"2026-05-29" },
  { id:"ps2", code:"AMM-BLD", name_ar:"وسط البلد", name_en:"Downtown", lat:31.9516, lng:35.9397, governorate:"عمان", city:"عمان", isTerminal:true, hasShelter:true, hasLighting:true, hasAccessibility:true, hasTicketMachine:true, hasAc:false, photoUrl:null, parentStationId:null, createdAt:"2026-01-01", updatedAt:"2026-01-01", savedAt:"2026-05-29" },
];

function formatSavedDate(iso: string): string {
  try {
    const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (diffH < 1) return "الآن";
    if (diffH < 24) return `قبل ${diffH} ساعة`;
    if (diffH < 48) return "أمس";
    return `قبل ${Math.floor(diffH / 24)} يوم`;
  } catch { return ""; }
}

// ─── Route Card ────────────────────────────────────────────────────────────
const RouteCard = React.memo<{ route: TransitRoute & { savedAt: string }; onPress: (r: TransitRoute) => void }>(
  ({ route, onPress }) => (
    <TouchableOpacity style={s.card} onPress={() => onPress(route)} activeOpacity={0.7}>
      <View style={[s.modeStripe, { backgroundColor: TRANSPORT_MODES[route.mode]?.color || route.color }]} />
      <View style={s.cardContent}>
        <View style={s.cardHeader}>
          <TransitBadge mode={route.mode} code={route.code} size="md" />
          <Text style={s.date}>{formatSavedDate(route.savedAt)}</Text>
        </View>
        <Text style={s.name}>{route.name_ar}</Text>
        <View style={s.meta}>
          <Text style={s.metaText}>{route.originName_ar || "—"} → {route.destinationName_ar || "—"}</Text>
          <Text style={s.metaText}>{route.duration_min} د · {route.fare_jod.toFixed(3)} د.أ</Text>
        </View>
      </View>
    </TouchableOpacity>
  )
);

// ─── Stop Card ─────────────────────────────────────────────────────────────
const StopCard = React.memo<{ stop: TransitStop & { savedAt: string }; onPress: (s: TransitStop) => void }>(
  ({ stop, onPress }) => (
    <TouchableOpacity style={s.card} onPress={() => onPress(stop)} activeOpacity={0.7}>
      <View style={[s.modeStripe, { backgroundColor: colors.brand_blue }]} />
      <View style={s.cardContent}>
        <View style={s.cardHeader}>
          <Text style={s.name}>{stop.name_ar}</Text>
          <Text style={s.date}>{formatSavedDate(stop.savedAt)}</Text>
        </View>
        <View style={s.meta}>
          <Text style={s.metaText}>{stop.code} · {stop.governorate}</Text>
        </View>
        <View style={s.amenities}>
          {stop.hasShelter && <Text>🏠</Text>}
          {stop.hasAccessibility && <Text>♿</Text>}
          {stop.hasLighting && <Text>💡</Text>}
          {stop.hasAc && <Text>❄️</Text>}
        </View>
      </View>
    </TouchableOpacity>
  )
);

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────
export default function SavedRoutesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [activeTab, setActiveTab] = useState<TabKey>("routes");
  const [savedRoutes] = useState(MOCK_SAVED_ROUTES);
  const [savedStops] = useState(MOCK_SAVED_STOPS);

  const data = activeTab === "routes" ? savedRoutes : savedStops;

  return (
    <ErrorBoundary>
      <View style={[s.root, { paddingTop: insets.top + 8 }]}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.title}>المحفوظات</Text>
          <View style={s.headerBtn} />
        </View>

        <View style={s.tabs}>
          {(["routes", "stops"] as TabKey[]).map((k) => (
            <TouchableOpacity
              key={k}
              style={[s.tab, activeTab === k && s.tabActive]}
              onPress={() => setActiveTab(k)}
            >
              <Text style={[s.tabText, activeTab === k && s.tabTextActive]}>
                {k === "routes" ? `🚌 الخطوط (${savedRoutes.length})` : `📍 المحطات (${savedStops.length})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={data as any[]}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={s.list}
          renderItem={({ item }: { item: any }) =>
            activeTab === "routes" ? (
              <RouteCard route={item} onPress={(r) => navigation.navigate("RouteDetail", { routeId: r.id, routeName: r.name_ar })} />
            ) : (
              <StopCard stop={item} onPress={(st) => navigation.navigate("StopDetail", { stopId: st.id, stopName: st.name_ar })} />
            )
          }
          ListEmptyComponent={
            <View style={s.emptyState}>
              <Text style={s.emptyIcon}>{activeTab === "routes" ? "🚌" : "📍"}</Text>
              <Text style={s.emptyTitle}>{activeTab === "routes" ? "لا توجد خطوط محفوظة" : "لا توجد محطات محفوظة"}</Text>
              <Text style={s.emptyHint}>اضغط على ⭐ لحفظ المفضلة</Text>
            </View>
          }
        />
      </View>
    </ErrorBoundary>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface_2 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  headerBtn: { width: layout.touchTarget, height: layout.touchTarget, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, color: colors.text_primary },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[20], fontWeight: fontWeight.bold, color: colors.text_primary },
  tabs: { flexDirection: "row", marginHorizontal: spacing[4], marginBottom: spacing[3], backgroundColor: colors.surface, borderRadius: radius.pill, padding: 3 },
  tab: { flex: 1, paddingVertical: spacing[2], borderRadius: radius.pill, alignItems: "center" },
  tabActive: { backgroundColor: colors.brand_blue },
  tabText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium, color: colors.text_secondary },
  tabTextActive: { color: colors.white },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
  card: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.card, marginBottom: spacing[2], overflow: "hidden", ...shadows.sm },
  modeStripe: { width: 4 },
  cardContent: { flex: 1, padding: spacing[3] },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing[1] },
  date: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary },
  name: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold, color: colors.text_primary },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing[1] },
  metaText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_secondary },
  amenities: { flexDirection: "row", gap: 4, marginTop: spacing[1] },
  emptyState: { alignItems: "center", paddingTop: 64 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary, marginBottom: 4 },
  emptyHint: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_tertiary, textAlign: "center" },
});
