// ============================================================================
// دروب (Droob) — RoutesScreen (replaces Departures tab)
// Search, filter, route preview on map
// ============================================================================
import AdBanner from "@components/AdBanner";
import { AD_BANNER_ROUTES } from "@config/ads";

import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, TextInput, StyleSheet, FlatList, TouchableOpacity, Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { colors, radius, fontSize, fontWeight, spacing, shadows } from "@theme/tokens";
import { ErrorBoundary } from "@components/ErrorBoundary";
import LeafletMap from "@components/LeafletMap";
import TransitBadge from "@components/TransitBadge";
import { useTransitStore } from "@stores/transit.store";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Helpers ────────────────────────────────────────────────────────────────

function inferMode(id: string): "brt" | "city_bus" | "serveece" | "intercity" {
  if (id.startsWith("brt")) return "brt";
  if (id.startsWith("bus_")) return "city_bus";
  if (id.startsWith("serv_")) return "serveece";
  if (id.startsWith("inter_")) return "intercity";
  return "city_bus";
}

const MODE_COLORS: Record<string, string> = {
  city_bus: "#0066CC", brt: "#E60026", serveece: "#FF8C00", intercity: "#6B21A8",
};

const MODES = [
  { key: "all", label_ar: "الكل", label_en: "All" },
  { key: "city_bus", label_ar: "باص", label_en: "Bus" },
  { key: "brt", label_ar: "BRT", label_en: "BRT" },
  { key: "serveece", label_ar: "سرفيس", label_en: "Serveece" },
  { key: "intercity", label_ar: "خطوط", label_en: "Lines" },
];

function parseName(name: string): { origin: string; dest: string } {
  const arrowMatch = name.match(/^(.+?)\s*[→>-]\s*(.+)$/);
  if (arrowMatch) return { origin: arrowMatch[1].trim(), dest: arrowMatch[2].trim() };
  return { origin: name, dest: name };
}

/** Extract coordinates from API route data (path_geojson or polyline) converting [lng, lat] to [lat, lng] */
function extractPathCoords(route: any): [number, number][] {
  // Handle path_geojson as object OR as JSON string
  let pg = route.path_geojson;
  if (typeof pg === "string" && pg.length > 0) {
    try { pg = JSON.parse(pg); } catch { pg = null; }
  }
  if (pg?.type === "LineString" && Array.isArray(pg.coordinates) && pg.coordinates.length > 0) {
    return pg.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  }
  if (Array.isArray(route.polyline) && route.polyline.length > 0) {
    return route.polyline.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]);
  }
  return [];
}

/** Display-friendly route shape derived from API TransitRoute */
interface DisplayRoute {
  id: string;
  code: string;
  name: string;
  color: string;
  mode: string;
  coords: [number, number][];
}

// ─── Route Card ─────────────────────────────────────────────────────────────

const RouteCard: React.FC<{
  route: DisplayRoute; isSelected: boolean; onPress: () => void;
}> = React.memo(({ route, isSelected, onPress }) => {
  const { origin, dest } = parseName(route.name);
  return (
    <TouchableOpacity
      style={[styles.routeCard, isSelected && styles.routeCardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.modeBar, { backgroundColor: MODE_COLORS[route.mode] || route.color }]} />
      <View style={styles.routeInfo}>
        <View style={styles.routeHeader}>
          <TransitBadge mode={route.mode as any} code={route.code} size="sm" />
          <Text style={styles.routeName} numberOfLines={1}>{route.name}</Text>
        </View>
        <Text style={styles.routeDest} numberOfLines={1}>
          {origin} → {dest}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

// ─── MAIN ───────────────────────────────────────────────────────────────────

const RoutesScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState("");
  const [modeFilter, setModeFilter] = useState("all");
  const [selectedRoute, setSelectedRoute] = useState<DisplayRoute | null>(null);

  const lang = i18n.language?.startsWith("en") ? "en" : "ar";

  // ── Store-backed routes ──────────────────────────────────────────────
  const storeRoutes = useTransitStore((s) => s.routes);
  const fetchRoutes = useTransitStore((s) => s.fetchRoutes);

  React.useEffect(() => {
    fetchRoutes();
  }, [fetchRoutes]);

  // Convert API routes to display format
  const displayRoutes: DisplayRoute[] = useMemo(() => {
    return storeRoutes.map((r: any) => ({
      id: r.id,
      code: r.code || r.id,
      name: r.name_ar || r.code || r.id,
      color: r.color || "#0066CC",
      mode: r.mode || inferMode(r.id),
      coords: extractPathCoords(r),
    }));
  }, [storeRoutes]);

  const filtered = useMemo(() => {
    return displayRoutes.filter((r) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || r.id.toLowerCase().includes(q) || r.name.toLowerCase().includes(q) || r.code.toLowerCase().includes(q);
      const matchMode = modeFilter === "all" || r.mode === modeFilter;
      return matchSearch && matchMode;
    });
  }, [displayRoutes, search, modeFilter]);

  const polylineForSelected = useMemo(() => {
    if (!selectedRoute || selectedRoute.coords.length === 0) return [];
    return [
      {
        id: selectedRoute.id,
        coords: selectedRoute.coords,
        color: selectedRoute.color,
        weight: 4,
        opacity: 0.9,
      },
    ];
  }, [selectedRoute]);

  const handleRoutePress = useCallback((route: DisplayRoute) => {
    setSelectedRoute((prev) => (prev?.id === route.id ? null : route));
  }, []);

  return (
    <ErrorBoundary>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>{t("nav.routes")}</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder={lang === "ar" ? "ابحث برقم أو اسم الخط..." : "Search by route number or name..."}
            placeholderTextColor={colors.text_tertiary}
            textAlign={lang === "ar" ? "right" : "left"}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Text style={styles.clearBtn}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Mode filters */}
        <View style={styles.filterRow}>
          {MODES.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.filterPill, modeFilter === m.key && styles.filterPillActive]}
              onPress={() => setModeFilter(m.key)}
            >
              <Text style={[styles.filterText, modeFilter === m.key && styles.filterTextActive]}>
                {lang === "ar" ? m.label_ar : m.label_en}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Map preview */}
        {selectedRoute && (
          <View style={styles.mapWrap}>
            <LeafletMap
              style={styles.map}
              centerLat={selectedRoute.coords[0]?.[0] || 31.9539}
              centerLng={selectedRoute.coords[0]?.[1] || 35.9106}
              zoom={12}
              polylines={polylineForSelected}
            />
            <View style={styles.mapOverlay}>
              <Text style={styles.mapLabel}>{selectedRoute.name}</Text>
            </View>
          </View>
        )}

        {/* Route list */}
        <FlatList
          data={filtered}
          keyExtractor={(r) => r.id}
          renderItem={({ item }) => (
            <RouteCard
              route={item}
              isSelected={selectedRoute?.id === item.id}
              onPress={() => handleRoutePress(item)}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyIcon}>🗺️</Text>
              <Text style={styles.emptyText}>
                {lang === "ar" ? "لا توجد خطوط مطابقة" : "No matching routes"}
              </Text>
            </View>
          }
        />
      </View>
      <AdBanner adUnitId={AD_BANNER_ROUTES} />
    </ErrorBoundary>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  title: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[24], fontWeight: fontWeight.bold,
    color: colors.text_primary,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", marginHorizontal: spacing[4],
    backgroundColor: colors.surface_2, borderRadius: radius.lg, paddingHorizontal: spacing[3],
    height: 48, marginBottom: spacing[2],
  },
  searchIcon: { fontSize: 18, marginRight: spacing[2] },
  searchInput: {
    flex: 1, fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], color: colors.text_primary,
  },
  clearBtn: { fontSize: 16, color: colors.text_tertiary, padding: spacing[2] },
  filterRow: {
    flexDirection: "row", paddingHorizontal: spacing[4], gap: spacing[2], marginBottom: spacing[1],
  },
  filterPill: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2,
    borderRadius: radius.pill, backgroundColor: colors.surface_2,
  },
  filterPillActive: { backgroundColor: colors.brand_blue },
  filterText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_secondary,
  },
  filterTextActive: { color: "#fff" },
  mapWrap: {
    height: SH * 0.28, marginHorizontal: spacing[4], borderRadius: radius.lg,
    overflow: "hidden", marginBottom: spacing[2],
  },
  map: { flex: 1 },
  mapOverlay: {
    position: "absolute", top: spacing[2], left: spacing[3], right: spacing[3],
    backgroundColor: "rgba(0,0,0,0.6)", borderRadius: radius.md, padding: spacing[2],
  },
  mapLabel: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.bold, color: "#fff",
  },
  list: { paddingHorizontal: spacing[4], paddingBottom: 100 },
  routeCard: {
    flexDirection: "row", backgroundColor: colors.surface, borderRadius: radius.lg,
    marginBottom: spacing[2], overflow: "hidden", ...shadows.sm,
  },
  routeCardSelected: { borderWidth: 1.5, borderColor: colors.brand_blue },
  modeBar: { width: 4 },
  routeInfo: { flex: 1, padding: spacing[3] },
  routeHeader: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: spacing[1] },
  routeName: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.semiBold,
    color: colors.text_primary, flex: 1,
  },
  routeDest: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_secondary,
  },
  empty: { alignItems: "center", paddingTop: 60 },
  emptyIcon: { fontSize: 48, marginBottom: spacing[3] },
  emptyText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], color: colors.text_tertiary,
  },
});

export default RoutesScreen;
