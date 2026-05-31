// ============================================================================
// دروب (Droob) — MapScreen (Full interactive map)
// Displays user location, nearby stops, and live vehicle positions
// ============================================================================

import React, { useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import LeafletMap, { type LeafletMapRef } from "@components/LeafletMap";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import { AMMAN_CENTER, LANDMARK_STOPS } from "../config/transport.config";

const MARKERS = LANDMARK_STOPS.slice(0, 10).map((s) => ({
  id: s.code, lat: s.lat, lng: s.lng, label: s.name_ar, color: colors.brand_blue,
}));

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const mapRef = useRef<LeafletMapRef>(null);

  const handleLocateMe = useCallback(() => {
    mapRef.current?.flyTo(AMMAN_CENTER.lng, AMMAN_CENTER.lat, 14);
  }, []);

  return (
    <ErrorBoundary>
      <View style={styles.root}>
        <LeafletMap
          ref={mapRef}
          style={styles.map}
          centerLat={AMMAN_CENTER.lat}
          centerLng={AMMAN_CENTER.lng}
          zoom={13}
          markers={MARKERS}
        />

        {/* Minimal header */}
        <View style={[styles.header, { top: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>الخريطة</Text>
          <View style={{ width: layout.touchTarget }} />
        </View>

        {/* My Location FAB */}
        <TouchableOpacity style={styles.fab} onPress={handleLocateMe} activeOpacity={0.8}>
          <Text style={styles.fabIcon}>📍</Text>
        </TouchableOpacity>

        {/* Legend */}
        <View style={styles.legend}>
          <Text style={styles.legendText}>🔵 باص مدني  🔴 باص سريع  🟠 سرفيس  🟣 بين المدن</Text>
        </View>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  header: { position: "absolute", left: spacing[4], right: spacing[4], flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10 },
  backBtn: { width: layout.touchTarget, height: layout.touchTarget, borderRadius: layout.touchTarget / 2, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center", ...shadows.md },
  backIcon: { fontSize: 20, color: colors.text_primary },
  headerTitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary, backgroundColor: colors.surface, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.pill, ...shadows.md },
  fab: { position: "absolute", bottom: 32, right: spacing[4], width: layout.fabSize, height: layout.fabSize, borderRadius: layout.fabSize / 2, backgroundColor: colors.brand_blue, alignItems: "center", justifyContent: "center", ...shadows.xl, zIndex: 10 },
  fabIcon: { fontSize: 24 },
  legend: { position: "absolute", bottom: 32, left: spacing[4], backgroundColor: colors.surface, paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.pill, ...shadows.sm, zIndex: 10 },
  legendText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary },
});
