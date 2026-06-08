// ============================================================================
// دروب (Droob) — MapScreen (Full map + Location Selection mode)
// Normal mode: browse stops on map
// Selection mode: crosshair + confirm button — returns coordinates to caller
// ============================================================================

import React, { useCallback, useRef, useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute } from "@react-navigation/native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import LeafletMap, { type LeafletMapRef } from "@components/LeafletMap";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import { AMMAN_CENTER, LANDMARK_STOPS } from "../config/transport.config";
import { useAppStore } from "@stores/app.store";

const MARKERS = LANDMARK_STOPS.slice(0, 10).map((s) => ({
  id: s.code, lat: s.lat, lng: s.lng, label: s.name_ar, color: colors.brand_blue,
}));

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const mapRef = useRef<LeafletMapRef>(null);
  const [center, setCenter] = useState<{lat: number; lng: number}>(AMMAN_CENTER);

  const selectionMode = route.params?.selectionMode ?? false;
  const selectionTarget = route.params?.selectionTarget ?? "from";

  const handleLocateMe = useCallback(() => {
    mapRef.current?.flyTo(AMMAN_CENTER.lng, AMMAN_CENTER.lat, 14);
  }, []);

  const setPendingMapSelection = useAppStore((s) => s.setPendingMapSelection);

  const handleConfirmLocation = useCallback(() => {
    // Store coordinates in Zustand, then go back
    setPendingMapSelection(
      { lat: center.lat, lng: center.lng },
      selectionTarget
    );
    navigation.goBack();
  }, [navigation, center, selectionTarget, setPendingMapSelection]);

  // Update center when user pans the map (via onCenterChange prop if available)
  const handleMapMove = useCallback((lat: number, lng: number) => {
    setCenter({ lat, lng });
  }, []);

  return (
    <ErrorBoundary>
      <View style={styles.root}>
        <LeafletMap
          ref={mapRef}
          style={styles.map}
          centerLat={center.lat}
          centerLng={center.lng}
          zoom={15}
          markers={selectionMode ? [] : MARKERS}
          onCenterChange={handleMapMove}
        />

        {/* Header */}
        <View style={[styles.header, { top: insets.top + 8 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {selectionMode ? "حدد الموقع" : "الخريطة"}
          </Text>
          <View style={{ width: layout.touchTarget }} />
        </View>

        {/* Selection Crosshair */}
        {selectionMode && (
          <>
            {/* Center crosshair */}
            <View style={styles.crosshair} pointerEvents="none">
              <Text style={styles.crosshairIcon}>📍</Text>
            </View>

            {/* Hint text */}
            <View style={[styles.hintBox, { top: insets.top + 80 }]}>
              <Text style={styles.hintText}>
                حرّك الخريطة لوضع المؤشر على الموقع المطلوب
              </Text>
            </View>

            {/* Confirm button */}
            <View style={[styles.confirmWrap, { bottom: insets.bottom + 24 }]}>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleConfirmLocation}
                activeOpacity={0.85}
              >
                <Text style={styles.confirmText}>
                  ✅  تأكيد الموقع
                  {selectionTarget === "from" ? " (نقطة الانطلاق)" : " (الوجهة)"}
                </Text>
              </TouchableOpacity>

              <Text style={styles.coordsText}>
                {center.lat.toFixed(6)}, {center.lng.toFixed(6)}
              </Text>
            </View>
          </>
        )}

        {/* My Location FAB (normal mode only) */}
        {!selectionMode && (
          <TouchableOpacity style={styles.fab} onPress={handleLocateMe} activeOpacity={0.8}>
            <Text style={styles.fabIcon}>📍</Text>
          </TouchableOpacity>
        )}

        {/* Legend (normal mode) */}
        {!selectionMode && (
          <View style={styles.legend}>
            <Text style={styles.legendText}>🔵 باص مدني  🔴 باص سريع  🟠 سرفيس  🟣 بين المدن</Text>
          </View>
        )}
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { ...StyleSheet.absoluteFillObject },
  header: {
    position: "absolute", left: spacing[4], right: spacing[4],
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", zIndex: 10,
  },
  backBtn: {
    width: layout.touchTarget, height: layout.touchTarget,
    borderRadius: layout.touchTarget / 2, backgroundColor: colors.surface,
    alignItems: "center", justifyContent: "center", ...shadows.md,
  },
  backIcon: { fontSize: 20, color: colors.text_primary },
  headerTitle: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold,
    color: colors.text_primary, backgroundColor: colors.surface,
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.pill, ...shadows.md,
  },
  // Selection mode
  crosshair: {
    position: "absolute", top: "50%", left: "50%",
    marginLeft: -18, marginTop: -36, zIndex: 5,
  },
  crosshairIcon: { fontSize: 36 },
  hintBox: {
    position: "absolute", left: spacing[4], right: spacing[4],
    alignItems: "center", zIndex: 5,
  },
  hintText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium,
    color: colors.text_primary, backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.pill, ...shadows.sm, overflow: "hidden",
  },
  confirmWrap: {
    position: "absolute", left: spacing[4], right: spacing[4], alignItems: "center", zIndex: 10,
  },
  confirmBtn: {
    backgroundColor: colors.brand_blue, paddingHorizontal: spacing[6],
    paddingVertical: spacing[3] + 2, borderRadius: radius.pill,
    ...shadows.lg, width: "100%", alignItems: "center",
  },
  confirmText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold,
    color: "#fff",
  },
  coordsText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary,
    marginTop: spacing[1], backgroundColor: "rgba(255,255,255,0.8)",
    paddingHorizontal: spacing[3], paddingVertical: 2, borderRadius: radius.sm,
  },
  // Normal mode
  fab: {
    position: "absolute", bottom: 32, right: spacing[4],
    width: layout.fabSize, height: layout.fabSize, borderRadius: layout.fabSize / 2,
    backgroundColor: colors.brand_blue, alignItems: "center", justifyContent: "center",
    ...shadows.xl, zIndex: 10,
  },
  fabIcon: { fontSize: 24 },
  legend: {
    position: "absolute", bottom: 32, left: spacing[4], backgroundColor: colors.surface,
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderRadius: radius.pill, ...shadows.sm, zIndex: 10,
  },
  legendText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary,
  },
});
