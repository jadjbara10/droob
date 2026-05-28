// ============================================================================
// دروب (Droob) — Map Screen (Home Screen)
// Full-screen Mapbox map with floating search bar + bottom sheet
// ============================================================================

import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, ScrollView, StyleSheet,
  Dimensions, Animated, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Mapbox, { Camera, ShapeSource, CircleLayer, LineLayer, SymbolLayer } from '@rnmapbox/maps';
import { useTransitStore } from '../stores/transit.store';
import { TRANSPORT_MODES, COLORS, AMMAN_CENTER, DEFAULT_ZOOM, LANDMARK_STOPS } from '../config/transport.config';
import { TransportMode, TransitStop, TransitRoute, TransitVehicle } from '../types/transit.types';
import { subscribeVehicles, subscribeAlerts } from '../services/websocket';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const BOTTOM_SHEET_SNAP = SCREEN_HEIGHT * 0.3;

// ─── Arabic labels — reference ar.ts locale ─────────────────────────────
const LABELS = {
  searchPlaceholder: 'إلى أين؟',
  nearbyStops: 'محطات قريبة',
  quickAccess: 'وصول سريع',
  university: 'الجامعة',
  downtown: 'البلد',
  airport: 'المطار',
  abdali: 'العبدلي',
  walkTime: 'دق مشي',
  meter: 'متر',
  modes: {
    city_bus: 'باص',
    brt: 'BRT',
    serveece: 'سرفيس',
    intercity: 'خطوط',
  },
};

// ─── Mode Filter Pill ──────────────────────────────────────────────────────
function ModePill({ mode, active, onToggle }: {
  mode: TransportMode; active: boolean; onToggle: () => void;
}) {
  const config = TRANSPORT_MODES[mode];
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={[
        styles.modePill,
        { borderColor: config.color, backgroundColor: active ? config.color + '22' : '#fff' },
      ]}
      accessibilityRole="button"
      accessibilityLabel={config.label_ar}
    >
      <Text style={[styles.modePillIcon]}>{config.icon}</Text>
      <Text style={[styles.modePillText, { color: active ? config.color : '#6B7280' }]}>
        {LABELS.modes[mode] || config.label_ar}
      </Text>
    </TouchableOpacity>
  );
}

// ─── Nearby Stop Card ──────────────────────────────────────────────────────
function StopCard({ stop, onPress }: { stop: TransitStop; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.stopCard} onPress={onPress} accessibilityRole="button">
      <View style={[styles.stopDot, { backgroundColor: COLORS.cityBus }]} />
      <View style={styles.stopInfo}>
        <Text style={styles.stopName}>{stop.name_ar}</Text>
        <Text style={styles.stopMeta}>
          {stop.distance_m ? `${Math.round(stop.distance_m)} ${LABELS.meter}` : stop.name_en}
        </Text>
      </View>
      {stop.isTerminal && (
        <View style={styles.terminalBadge}>
          <Text style={styles.terminalText}>مجمع</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

// ─── Quick Access Chips ────────────────────────────────────────────────────
function QuickAccessChips({ onSelect }: { onSelect: (s: { lat: number; lng: number; name: string }) => void }) {
  const items = [
    { name: LABELS.university, ...LANDMARK_STOPS[4] },
    { name: LABELS.downtown, ...LANDMARK_STOPS[1] },
    { name: LABELS.airport, ...LANDMARK_STOPS[12] },
    { name: LABELS.abdali, ...LANDMARK_STOPS[2] },
  ];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll}>
      {items.map((item) => (
        <TouchableOpacity
          key={item.name}
          onPress={() => onSelect(item)}
          style={styles.quickChip}
        >
          <Text style={styles.quickChipText}>{item.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

// ─── Vehicle Marker Annotation ─────────────────────────────────────────────
function VehicleAnnotation({ vehicle }: { vehicle: TransitVehicle }) {
  return (
    <Mapbox.PointAnnotation
      id={vehicle.id}
      coordinate={[vehicle.lng, vehicle.lat]}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={[styles.vehicleMarker, { transform: [{ rotate: `${vehicle.bearing}deg` }] }]}>
        <Text style={{ fontSize: 12 }}>🚌</Text>
      </View>
    </Mapbox.PointAnnotation>
  );
}

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────
export default function MapScreen({ navigation }: { navigation: any }) {
  const {
    stops, vehicles, alerts, selectedModes, userLocation,
    fetchNearbyStops, setSelectedModes, setUserLocation, selectStop, updateVehiclePosition,
  } = useTransitStore();

  const [searchQuery, setSearchQuery] = useState('');
  const cameraRef = useRef<Camera>(null);

  // Toggle transport mode filter
  const toggleMode = useCallback((mode: TransportMode) => {
    const current = new Set(selectedModes);
    if (current.has(mode)) {
      current.delete(mode);
    } else {
      current.add(mode);
    }
    setSelectedModes([...current]);
  }, [selectedModes, setSelectedModes]);

  // Handle quick access tap
  const handleQuickAccess = useCallback((loc: { lat: number; lng: number; name: string }) => {
    cameraRef.current?.setCamera({
      centerCoordinate: [loc.lng, loc.lat],
      zoomLevel: 15,
      animationDuration: 800,
    });
  }, []);

  // Navigate to trip planner
  const goToPlanner = useCallback(() => {
    navigation.navigate('TripPlanner');
  }, [navigation]);

  // Navigate to stop departures
  const handleStopPress = useCallback((stop: TransitStop) => {
    selectStop(stop);
    navigation.navigate('Departures', { stopId: stop.id, stopName: stop.name_ar });
  }, [navigation, selectStop]);

  // Initial data load
  useEffect(() => {
    fetchNearbyStops(AMMAN_CENTER.lat, AMMAN_CENTER.lng);
  }, []);

  // Subscribe to WebSocket vehicles for active routes
  useEffect(() => {
    const cleanups: (() => void)[] = [];
    // Subscribe to all vehicle positions
    const unsub = subscribeVehicles('all', (data: any) => {
      if (data?.vehicles) {
        data.vehicles.forEach((v: TransitVehicle) => updateVehiclePosition(v));
      }
    });
    cleanups.push(unsub);
    return () => cleanups.forEach((fn) => fn());
  }, []);

  // ─── Render ──────────────────────────────────────────────────────────
  return (
    <View style={styles.container}>
      {/* MAP — full screen */}
      <Mapbox.MapView style={styles.map} styleURL={Mapbox.StyleURL.Street}>
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [AMMAN_CENTER.lng, AMMAN_CENTER.lat],
            zoomLevel: DEFAULT_ZOOM,
          }}
        />

        {/* Transit route polylines */}
        {useTransitStore.getState().routes
          .filter((r) => selectedModes.includes(r.mode))
          .map((route) => (
            <ShapeSource
              key={route.id}
              id={`route-${route.id}`}
              shape={{
                type: 'LineString',
                coordinates: route.polyline,
              }}
            >
              <LineLayer
                id={`route-line-${route.id}`}
                style={{
                  lineColor: route.color,
                  lineWidth: route.mode === 'brt' ? 4 : 3,
                  lineOpacity: route.mode === 'brt' ? 0.9 : 0.75,
                  lineDasharray: route.mode === 'serveece' ? [2, 1.5] : undefined,
                }}
              />
            </ShapeSource>
          ))}

        {/* Vehicle markers */}
        {vehicles.map((v) => (
          <VehicleAnnotation key={v.id} vehicle={v} />
        ))}

        {/* Stops as circles */}
        {stops
          .filter((s) => !selectedModes.length || selectedModes.includes('city_bus'))
          .map((stop) => (
            <ShapeSource
              key={`stop-${stop.id}`}
              id={`stop-point-${stop.id}`}
              shape={{
                type: 'Point',
                coordinates: [stop.lng, stop.lat],
              }}
            >
              <CircleLayer
                id={`stop-dot-${stop.id}`}
                style={{
                  circleRadius: stop.isTerminal ? 6 : 4,
                  circleColor: stop.isTerminal ? COLORS.primary : COLORS.cityBus,
                  circleStrokeWidth: 2,
                  circleStrokeColor: '#fff',
                }}
              />
            </ShapeSource>
          ))}
      </Mapbox.MapView>

      {/* SAFE AREA top + floating content */}
      <SafeAreaView style={styles.overlayTop} pointerEvents="box-none">
        {/* Floating Search Bar */}
        <TouchableOpacity style={styles.searchBar} onPress={goToPlanner} accessibilityRole="search">
          <Text style={styles.searchIcon}>🔍</Text>
          <Text style={styles.searchText}>{LABELS.searchPlaceholder}</Text>
        </TouchableOpacity>

        {/* Mode Filter Pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.modeScroll}
          contentContainerStyle={styles.modeScrollContent}
        >
          {(['city_bus', 'brt', 'serveece', 'intercity'] as TransportMode[]).map((mode) => (
            <ModePill
              key={mode}
              mode={mode}
              active={selectedModes.includes(mode)}
              onToggle={() => toggleMode(mode)}
            />
          ))}
        </ScrollView>

        {/* Alert Banner */}
        {alerts.length > 0 && (
          <View style={styles.alertBanner}>
            <Text style={styles.alertText}>
              ⚠️ {alerts[0].title_ar}
            </Text>
          </View>
        )}
      </SafeAreaView>

      {/* BOTTOM SHEET */}
      <View style={styles.bottomSheet}>
        {/* Quick Access */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{LABELS.quickAccess}</Text>
        </View>
        <QuickAccessChips onSelect={handleQuickAccess} />

        {/* Nearby Stops */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{LABELS.nearbyStops}</Text>
        </View>

        <ScrollView style={styles.stopList}>
          {stops.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color={COLORS.primary} />
              <Text style={styles.loadingText}>جاري تحميل المحطات...</Text>
            </View>
          ) : (
            stops.slice(0, 6).map((stop) => (
              <StopCard key={stop.id} stop={stop} onPress={() => handleStopPress(stop)} />
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
}

// ─── Styles (RTL-safe) ────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },

  // ── Overlay Top ──────────────────────────────────────────────────────
  overlayTop: {
    position: 'absolute', top: 0, left: 0, right: 0,
    paddingHorizontal: 16, paddingTop: 8,
  },
  searchBar: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15, shadowRadius: 8, elevation: 5,
  },
  searchIcon: { fontSize: 18, marginRight: 10 },
  searchText: { fontSize: 16, color: '#9CA3AF', writingDirection: 'rtl' },

  // ── Mode Pills ──────────────────────────────────────────────────────
  modeScroll: { marginTop: 10, maxHeight: 44 },
  modeScrollContent: { paddingHorizontal: 0, gap: 8 },
  modePill: {
    flexDirection: 'row', alignItems: 'center',
    borderRadius: 20, borderWidth: 1.5,
    paddingHorizontal: 14, paddingVertical: 7,
  },
  modePillIcon: { fontSize: 14, marginRight: 5 },
  modePillText: { fontSize: 13, fontWeight: '600', writingDirection: 'rtl' },

  // ── Alert Banner ────────────────────────────────────────────────────
  alertBanner: {
    backgroundColor: COLORS.cancelled, borderRadius: 10,
    padding: 10, marginTop: 8,
  },
  alertText: { color: '#fff', fontSize: 13, fontWeight: '500', writingDirection: 'rtl' },

  // ── Bottom Sheet ────────────────────────────────────────────────────
  bottomSheet: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 20,
    minHeight: BOTTOM_SHEET_SNAP,
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 15,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, writingDirection: 'rtl' },

  // ── Quick Access ────────────────────────────────────────────────────
  quickScroll: { marginBottom: 12, maxHeight: 40 },
  quickChip: {
    backgroundColor: COLORS.primary + '15', borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 8, marginRight: 8,
  },
  quickChipText: { color: COLORS.primary, fontSize: 13, fontWeight: '600', writingDirection: 'rtl' },

  // ── Stop Card ───────────────────────────────────────────────────────
  stopList: { maxHeight: 220 },
  loadingContainer: { alignItems: 'center', paddingVertical: 20 },
  loadingText: { marginTop: 8, color: COLORS.textSecondary, fontSize: 13, writingDirection: 'rtl' },
  stopCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F9FAFB', borderRadius: 14,
    padding: 14, marginBottom: 8,
  },
  stopDot: {
    width: 10, height: 10, borderRadius: 5, marginRight: 12,
  },
  stopInfo: { flex: 1 },
  stopName: { fontSize: 15, fontWeight: '600', color: COLORS.text, writingDirection: 'rtl' },
  stopMeta: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  terminalBadge: {
    backgroundColor: COLORS.primary, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  terminalText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // ── Vehicle ─────────────────────────────────────────────────────────
  vehicleMarker: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.brt,
  },
});