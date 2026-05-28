// ============================================================================
// دروب (Droob) — DeparturesScreen (لوحة المغادرات)
// Live departure board with stop header, departure rows, status pills, bell alerts
// RTL-optimized, WebSocket-ready, production polish
// ============================================================================

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInRight, Layout } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { Departure } from "@types/transit";
import { TransitBadge } from "@components/TransitBadge";
import { StatusPill } from "@components/StatusPill";
import { CountdownTimer } from "@components/CountdownTimer";
import { OccupancyIndicator } from "@components/OccupancyIndicator";

// ─── Mock Data ──────────────────────────────────────────────────────────────

const MOCK_DEPARTURES: Departure[] = [
  { id:"d1",stopId:"g1",lineCode:"BRT1",lineNameAr:"الباص السريع 1",lineNameEn:"BRT Line 1",destinationAr:"دوار الداخلية",destinationEn:"Dakhiliya",mode:"brt",scheduledAt:"09:10",estimatedAt:"09:08",countdownMinutes:4,status:"on_time",occupancy:"partial",platform:"A",hasAlert:false },
  { id:"d2",stopId:"g1",lineCode:"28",lineNameAr:"خط 28",lineNameEn:"Line 28",destinationAr:"المدينة الرياضية",destinationEn:"Sports City",mode:"city_bus",scheduledAt:"09:15",estimatedAt:"09:17",countdownMinutes:8,status:"delayed",occupancy:"full",platform:"B",hasAlert:true },
  { id:"d3",stopId:"g1",lineCode:"S5",lineNameAr:"سرفيس الصويفية",lineNameEn:"Sweifieh Serveece",destinationAr:"الصويفية",destinationEn:"Sweifieh",mode:"serveece",scheduledAt:"09:12",estimatedAt:"09:12",countdownMinutes:6,status:"on_time",occupancy:"empty",platform:"C",hasAlert:false },
  { id:"d4",stopId:"g1",lineCode:"BRT2",lineNameAr:"الباص السريع 2",lineNameEn:"BRT Line 2",destinationAr:"المحطة",destinationEn:"Terminal",mode:"brt",scheduledAt:"09:05",estimatedAt:"09:05",countdownMinutes:0,status:"cancelled",occupancy:"empty",platform:"A",hasAlert:true },
  { id:"d5",stopId:"g1",lineCode:"105",lineNameAr:"خط اربد",lineNameEn:"Irbid Line",destinationAr:"اربد",destinationEn:"Irbid",mode:"intercity",scheduledAt:"09:30",estimatedAt:"09:30",countdownMinutes:22,status:"on_time",occupancy:"partial",platform:"D",hasAlert:false },
];

// ─── Departure Row ──────────────────────────────────────────────────────────

const DepartureRow: React.FC<{ item: Departure; onPress: () => void; onBell: () => void }> = React.memo(({ item, onPress, onBell }) => (
  <Animated.View entering={FadeInRight.duration(300)} layout={Layout.springify()}>
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.7}>
      <TransitBadge mode={item.mode} code={item.lineCode} size="md" />
      <View style={styles.rowInfo}>
        <Text style={styles.rowDest} numberOfLines={1}>{item.destinationAr}</Text>
        <Text style={styles.rowLine} numberOfLines={1}>{item.lineNameAr}</Text>
        <OccupancyIndicator level={item.occupancy} size="sm" showLabel={false} />
      </View>
      <View style={styles.rowTime}>
        <CountdownTimer minutes={item.countdownMinutes} size="md" />
        <StatusPill status={item.status} size="sm" />
      </View>
      <TouchableOpacity style={styles.bell} onPress={onBell} hitSlop={8}>
        <Text style={styles.bellIcon}>{item.hasAlert ? "🔔" : "🔕"}</Text>
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
  const [departures] = useState(MOCK_DEPARTURES);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1500);
  }, []);

  const handleBell = useCallback((item: Departure) => {
    if (Platform.OS !== "web") void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerMain}>
          <Text style={styles.stopName}>محطة الجاردنز</Text>
          <View style={styles.headerMeta}>
            <View style={styles.stopCode}><Text style={styles.stopCodeText}>G01</Text></View>
            <LiveDot />
            <Text style={styles.liveLabel}>مباشر</Text>
          </View>
        </View>
        <Text style={styles.subtitle}>٤ خطوط نشطة</Text>
      </View>

      {/* Departure List */}
      <FlatList
        data={departures}
        keyExtractor={(d) => d.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <DepartureRow item={item} onPress={() => {}} onBell={() => handleBell(item)} />
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<Text style={styles.empty}>لا توجد رحلات قادمة</Text>}
      />

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
});

export default DeparturesScreen;
