// ============================================================================
// دروب (Droob) — Route Detail Screen (تفاصيل الخط)
// Shows route info: stops, schedule, live vehicles, alerts
// ============================================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, ScrollView, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/transport.config';

interface Stop {
  id: string;
  name: string;
  sequence: number;
  arrival?: string;
  hasShelter: boolean;
  hasLight: boolean;
  accessible: boolean;
}

interface Vehicle {
  id: string;
  plate: string;
  lat: number;
  lng: number;
  speed: number;
  occupancy: 'low' | 'medium' | 'high';
}

const MOCK_ROUTE = {
  id: 'BRT1',
  name: 'الباص السريع — خط صويلح',
  nameEn: 'BRT Line 1 — Sweileh',
  type: 'brt' as const,
  color: COLORS.brt,
  operator: 'أمانة عمان الكبرى — قسم الباص السريع',
  from: 'شارع القدس',
  to: 'صويلح',
  distance: 22.5, // km
  duration: 35,   // min
  headway: 'كل ١٠-١٥ دقيقة',
  fare: '٠.٥٠ دينار أردني',
  schedule: '٥:٣٠ صباحاً — ١١:٠٠ مساءً',
  fridaySchedule: '٥:٣٠ ص — ١١:٠٠ ص | ١:٣٠ م — ١٠:٠٠ م',
  features: ['مسار مخصص', 'محطات مكيفة', 'شاشات إلكترونية', 'آلة تذاكر', 'إنترنت مجاني'],
};

const MOCK_STOPS: Stop[] = [
  { id: 's1', name: 'شارع القدس', sequence: 1, arrival: '٥:٣٠ ص', hasShelter: true, hasLight: true, accessible: true },
  { id: 's2', name: 'وسط البلد', sequence: 2, arrival: '٥:٣٥ ص', hasShelter: true, hasLight: true, accessible: true },
  { id: 's3', name: 'العبدلي', sequence: 3, arrival: '٥:٤٠ ص', hasShelter: true, hasLight: true, accessible: true },
  { id: 's4', name: 'دوار الداخلية', sequence: 4, arrival: '٥:٤٨ ص', hasShelter: true, hasLight: true, accessible: true },
  { id: 's5', name: 'الجامعة الأردنية', sequence: 5, arrival: '٥:٥٥ ص', hasShelter: true, hasLight: true, accessible: true },
  { id: 's6', name: 'صويلح', sequence: 6, arrival: '٦:٠٥ ص', hasShelter: true, hasLight: true, accessible: true },
];

const MOCK_VEHICLES: Vehicle[] = [
  { id: 'v1', plate: '٩-٤٢٣٥', lat: 31.956, lng: 35.906, speed: 45, occupancy: 'medium' },
  { id: 'v2', plate: '٧-٨٩١٢', lat: 31.962, lng: 35.918, speed: 30, occupancy: 'low' },
  { id: 'v3', plate: '٣-٥٦٧٨', lat: 31.972, lng: 35.921, speed: 52, occupancy: 'high' },
];

function getOccupancyConfig(occ: Vehicle['occupancy']) {
  switch (occ) {
    case 'low': return { color: '#16A34A', label: 'فارغ', icon: '🔵' };
    case 'medium': return { color: '#EAB308', label: 'ممتلئ جزئياً', icon: '🟡' };
    case 'high': return { color: '#DC2626', label: 'ممتلئ', icon: '🔴' };
  }
}

export default function RouteDetailScreen() {
  const [activeTab, setActiveTab] = useState<'stops' | 'vehicles'>('stops');

  const renderStop = useCallback(({ item, index }: { item: Stop; index: number }) => (
    <View style={styles.stopRow}>
      {/* Timeline */}
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, index === 0 && styles.timelineDotFirst, index === MOCK_STOPS.length - 1 && styles.timelineDotLast]} />
        {index < MOCK_STOPS.length - 1 && <View style={styles.timelineLine} />}
      </View>
      {/* Stop info */}
      <View style={styles.stopInfo}>
        <Text style={styles.stopName}>{item.name}</Text>
        <View style={styles.stopMeta}>
          <Text style={styles.arrivalTime}>⏱ {item.arrival}</Text>
          <View style={styles.amenities}>
            {item.hasShelter && <MaterialCommunityIcons name="umbrella" size={13} color={COLORS.textSecondary} />}
            {item.hasLight && <MaterialCommunityIcons name="lightbulb-on-outline" size={13} color={COLORS.textSecondary} />}
            {item.accessible && <MaterialCommunityIcons name="wheelchair-accessibility" size={13} color={COLORS.textSecondary} />}
          </View>
        </View>
      </View>
    </View>
  ), []);

  const renderVehicle = useCallback(({ item }: { item: Vehicle }) => {
    const oc = getOccupancyConfig(item.occupancy);
    return (
      <View style={styles.vehicleCard}>
        <View style={styles.vehicleHeader}>
          <MaterialCommunityIcons name="bus-articulated" size={22} color={MOCK_ROUTE.color} />
          <View style={styles.vehicleInfo}>
            <Text style={styles.vehiclePlate}>{item.plate}</Text>
            <Text style={styles.vehicleSpeed}>{item.speed} كم/س</Text>
          </View>
        </View>
        <View style={[styles.occupancyBadge, { backgroundColor: oc.color + '20' }]}>
          <Text style={[styles.occupancyText, { color: oc.color }]}>{oc.icon} {oc.label}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Route Header */}
        <View style={[styles.routeBanner, { backgroundColor: MOCK_ROUTE.color + '15' }]}>
          <View style={[styles.routeBadge, { backgroundColor: MOCK_ROUTE.color }]}>
            <MaterialCommunityIcons name="bus-articulated" size={24} color="#FFF" />
          </View>
          <View style={styles.routeInfo}>
            <Text style={styles.routeName}>{MOCK_ROUTE.name}</Text>
            <Text style={styles.routeFromTo}>{MOCK_ROUTE.from}  ←  {MOCK_ROUTE.to}</Text>
            <Text style={styles.operator}>{MOCK_ROUTE.operator}</Text>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          {[
            { icon: 'clock-outline', label: 'المدة', value: `${MOCK_ROUTE.duration} دق` },
            { icon: 'map-marker-distance', label: 'المسافة', value: `${MOCK_ROUTE.distance} كم` },
            { icon: 'cash-multiple', label: 'الأجرة', value: MOCK_ROUTE.fare },
            { icon: 'sync', label: 'التواتر', value: MOCK_ROUTE.headway },
          ].map((s, i) => (
            <View key={i} style={styles.statCard}>
              <MaterialCommunityIcons name={s.icon as any} size={18} color={MOCK_ROUTE.color} />
              <Text style={styles.statLabel}>{s.label}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
            </View>
          ))}
        </View>

        {/* Schedule */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>مواعيد التشغيل</Text>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>🗓 أيام الأسبوع:</Text>
            <Text style={styles.scheduleValue}>{MOCK_ROUTE.schedule}</Text>
          </View>
          <View style={styles.scheduleRow}>
            <Text style={styles.scheduleLabel}>🕌 الجمعة:</Text>
            <Text style={styles.scheduleValue}>{MOCK_ROUTE.fridaySchedule}</Text>
          </View>
        </View>

        {/* Features */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>مميزات الخط</Text>
          <View style={styles.featuresRow}>
            {MOCK_ROUTE.features.map((f, i) => (
              <View key={i} style={styles.featureBadge}>
                <Text style={styles.featureText}>✓ {f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Tab Switcher */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'stops' && styles.tabActive]}
            onPress={() => setActiveTab('stops')}
          >
            <MaterialCommunityIcons name="bus-stop-covered" size={18} color={activeTab === 'stops' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'stops' && styles.tabTextActive]}>المحطات ({MOCK_STOPS.length})</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'vehicles' && styles.tabActive]}
            onPress={() => setActiveTab('vehicles')}
          >
            <MaterialCommunityIcons name="bus-marker" size={18} color={activeTab === 'vehicles' ? COLORS.primary : COLORS.textSecondary} />
            <Text style={[styles.tabText, activeTab === 'vehicles' && styles.tabTextActive]}>المركبات ({MOCK_VEHICLES.length})</Text>
          </TouchableOpacity>
        </View>

        {/* Stops List or Vehicles List */}
        {activeTab === 'stops' ? (
          <View style={styles.stopsContainer}>
            {MOCK_STOPS.map((stop, idx) => (
              <View key={stop.id}>{renderStop({ item: stop, index: idx })}</View>
            ))}
          </View>
        ) : (
          <View style={styles.vehiclesContainer}>
            {MOCK_VEHICLES.map(v => (
              <View key={v.id}>{renderVehicle({ item: v })}</View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  // Route banner
  routeBanner: {
    flexDirection: 'row',
    padding: 20,
    gap: 14,
    alignItems: 'center',
  },
  routeBadge: {
    width: 56, height: 56, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 4, elevation: 3,
  },
  routeInfo: { flex: 1, gap: 3 },
  routeName: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  routeFromTo: { fontSize: 13, color: COLORS.textSecondary },
  operator: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  // Stats
  statsRow: {
    flexDirection: 'row', paddingHorizontal: 16, paddingTop: 8, gap: 8,
  },
  statCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 12, alignItems: 'center', gap: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  statLabel: { fontSize: 10, color: COLORS.textSecondary },
  statValue: { fontSize: 13, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  // Section cards
  sectionCard: {
    backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16, marginHorizontal: 16, marginTop: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 3, elevation: 1,
  },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  scheduleRow: {
    flexDirection: 'row', marginBottom: 6, gap: 6,
  },
  scheduleLabel: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary, minWidth: 100 },
  scheduleValue: { fontSize: 12, color: COLORS.text, flex: 1 },
  featuresRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  featureBadge: {
    backgroundColor: COLORS.onTime + '15', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
  },
  featureText: { fontSize: 11, color: COLORS.onTime, fontWeight: '600' },
  // Tabs
  tabRow: {
    flexDirection: 'row', marginHorizontal: 16, marginTop: 16,
    backgroundColor: '#E5E7EB', borderRadius: 10, padding: 3,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 6,
  },
  tabActive: { backgroundColor: '#FFFFFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 2, elevation: 1 },
  tabText: { fontSize: 13, fontWeight: '600', color: COLORS.textSecondary },
  tabTextActive: { color: COLORS.primary },
  // Stops
  stopsContainer: { paddingHorizontal: 24, paddingTop: 16 },
  stopRow: { flexDirection: 'row', gap: 14, minHeight: 60 },
  timeline: { alignItems: 'center', width: 16 },
  timelineDot: {
    width: 12, height: 12, borderRadius: 6, backgroundColor: MOCK_ROUTE.color, borderWidth: 2, borderColor: '#FFF',
  },
  timelineDotFirst: { width: 14, height: 14, borderRadius: 7 },
  timelineDotLast: { backgroundColor: COLORS.onTime },
  timelineLine: { width: 3, flex: 1, backgroundColor: MOCK_ROUTE.color + '40', marginVertical: 2 },
  stopInfo: { flex: 1, paddingBottom: 16 },
  stopName: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  stopMeta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 },
  arrivalTime: { fontSize: 12, color: COLORS.textSecondary },
  amenities: { flexDirection: 'row', gap: 6 },
  // Vehicles
  vehiclesContainer: { paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  vehicleCard: {
    backgroundColor: '#FFFFFF', borderRadius: 12, padding: 14,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  vehicleHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  vehicleInfo: { gap: 2 },
  vehiclePlate: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  vehicleSpeed: { fontSize: 12, color: COLORS.textSecondary },
  occupancyBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  occupancyText: { fontSize: 11, fontWeight: '700' },
});