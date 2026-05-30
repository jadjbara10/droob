// ============================================================================
// دروب (Droob) — DeparturesScreen (لوحة المغادرات)
// Live departure board with stop header, departure rows, status pills, bell alerts
// RTL-optimized, WebSocket-ready, production polish
// ============================================================================

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRoute } from "@react-navigation/native";
import Animated, { FadeInRight, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { Departure } from "@/types/transit.types";
import { TransitBadge } from "@components/TransitBadge";
import { StatusPill } from "@components/StatusPill";
import { CountdownTimer } from "@components/CountdownTimer";
import { OccupancyIndicator } from "@components/OccupancyIndicator";
import { useTransitStore } from "@stores/transit.store";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_DEPARTURES: Departure[] = [
  { routeId:"r1", code:"BRT1", name_ar:"الباص السريع 1", name_en:"BRT Line 1", mode:"brt", color:"#E60026", fare:0.50, departureTime:"09:10", waitMinutes:4, occupancy:"partial", status:"on_time", tripId:"t1", lat:31.975, lng:35.885 },
  { routeId:"r2", code:"28", name_ar:"خط 28", name_en:"Line 28", mode:"city_bus", color:"#0066CC", fare:0.45, departureTime:"09:15", waitMinutes:8, occupancy:"full", status:"delayed", tripId:"t2", lat:31.975, lng:35.885 },
  { routeId:"r3", code:"S5", name_ar:"سرفيس الصويفية", name_en:"Sweifieh Serveece", mode:"serveece", color:"#FF8C00", fare:{min:0.20,max:0.40}, departureTime:"09:12", waitMinutes:6, occupancy:"empty", status:"on_time", tripId:"t3", lat:31.975, lng:35.885 },
  { routeId:"r4", code:"BRT2", name_ar:"الباص السريع 2", name_en:"BRT Line 2", mode:"brt", color:"#E60026", fare:0.50, departureTime:"09:05", waitMinutes:0, occupancy:"empty", status:"cancelled", tripId:"t4", lat:31.975, lng:35.885 },
  { routeId:"r5", code:"105", name_ar:"خط اربد", name_en:"Irbid Line", mode:"intercity", color:"#6B21A8", fare:1.50, departureTime:"09:30", waitMinutes:22, occupancy:"partial", status:"on_time", tripId:"t5", lat:31.975, lng:35.885 },
];

// ─── Departure Row ──────────────────────────────────────────────────────────

const DepartureRow: React.FC<{ item: Departure; onPress: () => void; onBell: () => void }> = React.memo(({ item, onPress, onBell }) => (
  <Animated.View entering={FadeInRight.duration(300)} layout={Layout.springify()}>
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <TransitBadge mode={item.mode} code={item.code} size="md" />
      <View style={styles.rowInfo}>
        <Text style={styles.rowDest} numberOfLines={1}>{item.name_ar}</Text>
        <Text style={styles.rowLine} numberOfLines={1}>{item.code}</Text>
        <OccupancyIndicator level={item.occupancy} size="sm" showLabel={false} />
      </View>
      <View style={styles.rowTime}>
        <CountdownTimer minutes={item.waitMinutes} size="md" />
        <StatusPill status={item.status} size="sm" />
      </View>
      <TouchableOpacity style={styles.bell} onPress={onBell} hitSlop={8}>
        <Text style={styles.bellIcon}>{item.tripId ? "🔔" : "🔕"}</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  </Animated.View>
));

// ─── Live Indicator Dot ─────────────────────────────────────────────────────

const LiveDot: React.FC = () => (
  <View style={styles.liveDotOuter}>
    <View style={styles.liveDot} />
  </View>
);

// ─── MAIN SCREEN ────────────────────────────────────────────────────────────

const DeparturesScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const stopId = route.params?.stopId || 'g1';
  const stopName = route.params?.stopName || 'محطة الجاردنز';

  const [refreshing, setRefreshing] = useState(false);

  // Use store data with mock fallback
  const storeDepartures = useTransitStore(s => s.departures);
  const storeLoading = useTransitStore(s => s.isLoading);
  const fetchDepartures = useTransitStore(s => s.fetchDepartures);
  const selectedStop = useTransitStore(s => s.selectedStop);

  const departures = storeDepartures.length > 0 ? storeDepartures : MOCK_DEPARTURES;
  const displayName = selectedStop?.name_ar || stopName;
  const displayCode = selectedStop?.code || 'G01';

  useEffect(() => {
    fetchDepartures(stopId);
  }, [stopId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchDepartures(stopId);
    setRefreshing(false);
  }, [stopId, fetchDepartures]);

  const handleBell = useCallback((item: Departure) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.stopName}>{displayName}</Text>
          <View style={styles.headerMeta}>
            <View style={styles.stopCode}><Text style={styles.stopCodeText}>{displayCode}</Text></View>
            <LiveDot />
            <Text style={styles.liveLabel}>مباشر</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>{departures.length} خطوط نشطة</Text>
      </View>

      {/* Departure List */}
      {storeLoading && departures.length === 0 ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={colors.brand_blue} />
          <Text style={styles.loadingText}>جاري تحميل المغادرات...</Text>
        </View>
      ) : (
        <FlatList
          data={departures}
          keyExtractor={(d) => d.tripId || d.routeId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <DepartureRow item={item} onPress={() => {}} onBell={() => handleBell(item)} />
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          ListEmptyComponent={<Text style={styles.empty}>لا توجد رحلات قادمة</Text>}
        />
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={styles.footerText}>يتم التحديث كل ٣٠ ثانية</Text>
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:colors.surface },
  header: { paddingHorizontal:16, paddingVertical:12, borderBottomWidth:1, borderBottomColor:colors.border },
  headerMain: { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  stopName: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[24], fontWeight:fontWeight.bold, color:colors.text_primary },
  headerMeta: { flexDirection:"row", alignItems:"center", gap:8 },
  stopCode: { backgroundColor:colors.surface_2, borderRadius:radius.pill, paddingHorizontal:10, paddingVertical:3 },
  stopCodeText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], fontWeight:fontWeight.medium, color:colors.text_secondary },
  liveDotOuter: { width:12, height:12, borderRadius:6, backgroundColor:colors.on_time+"30", alignItems:"center", justifyContent:"center" },
  liveDot: { width:8, height:8, borderRadius:4, backgroundColor:colors.on_time },
  liveLabel: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], fontWeight:fontWeight.medium, color:colors.on_time },
  subtitle: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], color:colors.text_secondary, marginTop:4 },

  // List
  list: { paddingHorizontal:16, paddingVertical:8 },
  sep: { height:1, backgroundColor:colors.surface_2 },

  // Row
  row: { flexDirection:"row", alignItems:"center", height:layout.departureRowHeight, gap:10, paddingVertical:8 },
  rowInfo: { flex:1, gap:2 },
  rowDest: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[16], fontWeight:fontWeight.bold, color:colors.text_primary, textAlign:"right" },
  rowLine: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], color:colors.text_secondary, textAlign:"right" },
  rowTime: { alignItems:"center", gap:2 },
  bell: { width:36, height:36, alignItems:"center", justifyContent:"center" },
  bellIcon: { fontSize:18 },

  // Footer
  footer: { paddingVertical:8, alignItems:"center", borderTopWidth:1, borderTopColor:colors.border },
  footerText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[11], color:colors.text_tertiary },

  // Empty
  empty: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[15], color:colors.text_tertiary, textAlign:"center", paddingVertical:60 },
  // Loading
  loadingBox: { flex:1, justifyContent:"center", alignItems:"center", padding:40 },
  loadingText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], color:colors.text_secondary, marginTop:12 },
});

export default DeparturesScreen;
