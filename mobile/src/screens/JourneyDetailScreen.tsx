// ============================================================================
// دروب (Droob) — Journey Detail Screen (تفاصيل الرحلة)
// Full multi-leg journey: step-by-step with instructions, timing, fare
// Works with real Journey/JourneyLeg types from transit.types.ts
// ============================================================================

import React, { useMemo } from 'react';
import {
  View, Text, FlatList, StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { COLORS, TRANSPORT_MODES } from '../config/transport.config';
import { useTransitStore } from '../stores/transit.store';
import { Journey, JourneyLeg } from '../types/transit.types';

function getLegIcon(mode: JourneyLeg['mode']): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (mode) {
    case 'walking': return 'walk';
    case 'brt': return 'bus-clock';
    case 'city_bus': return 'bus';
    case 'serveece': return 'bus-multiple';
    case 'intercity': return 'bus-double-decker';
    default: return 'bus';
  }
}

function getLegColor(mode: JourneyLeg['mode']): string {
  const cfg = TRANSPORT_MODES[mode as keyof typeof TRANSPORT_MODES];
  if (cfg?.color) return cfg.color;
  if (mode === 'walking') return COLORS.walking;
  return COLORS.textSecondary;
}

export default function JourneyDetailScreen() {
  const route = useRoute<any>();
  const { journeys } = useTransitStore();

  // Try to load journey from store or route params
  const journey: Journey | undefined = useMemo(() => {
    const id = route.params?.journeyId;
    if (id && journeys.length > 0) {
      return journeys.find((j) => j.id === id);
    }
    return route.params?.journey;
  }, [route.params, journeys]);

  if (!journey) {
    return (
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <View style={styles.emptyState}>
          <MaterialCommunityIcons name="routes" size={48} color="#D1D5DB" />
          <Text style={styles.emptyText}>الرحلة غير متوفرة</Text>
        </View>
      </SafeAreaView>
    );
  }

  const legs = journey.legs || [];
  const totalDuration = journey.duration_min || legs.reduce((s, l) => s + (l.duration_min || 0), 0);
  const totalFare = journey.totalFare_jod ?? legs.reduce((s, l) => s + (l.fare_jod || 0), 0);
  const walkDistance = journey.walkingDistance_km ?? 0;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={legs}
        keyExtractor={(item, idx) => `${journey.id}-leg-${idx}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            {/* Trip Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryRoute}>
                {journey.fromName_ar} ← {journey.toName_ar}
              </Text>
              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <MaterialCommunityIcons name="clock-outline" size={18} color={COLORS.primary} />
                  <Text style={styles.summaryStatValue}>{totalDuration} دقيقة</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <MaterialCommunityIcons name="cash-multiple" size={18} color={COLORS.primary} />
                  <Text style={styles.summaryStatValue}>{totalFare.toFixed(3)} د.أ</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryStat}>
                  <MaterialCommunityIcons name="transfer" size={18} color={COLORS.primary} />
                  <Text style={styles.summaryStatValue}>{legs.length} مراحل</Text>
                </View>
              </View>
              <View style={styles.departureBadge}>
                <MaterialCommunityIcons name="clock-start" size={13} color={COLORS.onTime} />
                <Text style={styles.departureText}>
                  المغادرة: {formatTime(journey.departureTime)}
                </Text>
                <Text style={styles.arrivalText}>
                  الوصول: {formatTime(journey.arrivalTime)}
                </Text>
              </View>
              {walkDistance > 0 && (
                <View style={styles.walkBadge}>
                  <MaterialCommunityIcons name="walk" size={14} color={COLORS.walking} />
                  <Text style={styles.walkText}>{walkDistance.toFixed(1)} كم مشي</Text>
                </View>
              )}
            </View>

            <Text style={styles.sectionTitle}>خطوات الرحلة</Text>
          </View>
        }
        renderItem={({ item, index }) => {
          const color = getLegColor(item.mode);
          const isLast = index === legs.length - 1;
          const isFirst = index === 0;

          return (
            <View style={styles.legRow}>
              {/* Timeline spine */}
              <View style={styles.timeline}>
                <View style={[
                  styles.timelineDot,
                  { backgroundColor: color },
                  isFirst && styles.timelineDotFirst,
                ]} />
                {!isLast && <View style={[styles.timelineLine, { backgroundColor: color }]} />}
              </View>

              {/* Leg Card */}
              <View style={[styles.legCard, { borderRightColor: color }]}>
                {/* Mode badge + duration */}
                <View style={styles.legHeader}>
                  <View style={[styles.modeBadge, { backgroundColor: color + '20' }]}>
                    <MaterialCommunityIcons
                      name={getLegIcon(item.mode)}
                      size={16}
                      color={color}
                    />
                    <Text style={[styles.modeText, { color }]}>
                      {item.routeCode || (item.mode === 'walking' ? 'مشي' : 'خط')}
                    </Text>
                  </View>
                  <View style={styles.durationBadge}>
                    <MaterialCommunityIcons name="clock-outline" size={11} color={COLORS.textSecondary} />
                    <Text style={styles.durationText}>{item.duration_min} دقيقة</Text>
                  </View>
                </View>

                {/* Instruction */}
                <Text style={styles.instruction}>
                  {item.instructions_ar || getDefaultInstruction(item)}
                </Text>

                {/* From → To */}
                {item.fromStop && item.toStop && (
                  <View style={styles.stopsRow}>
                    <Text style={styles.stopName}>{item.fromStop.name_ar}</Text>
                    <MaterialCommunityIcons name="arrow-left" size={14} color={COLORS.textSecondary} />
                    <Text style={styles.stopNameTo}>{item.toStop.name_ar}</Text>
                  </View>
                )}

                {/* Times + Fare */}
                <View style={styles.metaRow}>
                  <View style={styles.timeInfo}>
                    <Text style={styles.timeText}>
                      {formatTime(item.departureTime)} — {formatTime(item.arrivalTime)}
                    </Text>
                  </View>
                  {item.fare_jod > 0 && (
                    <View style={styles.fareBadge}>
                      <Text style={styles.fareText}>{item.fare_jod.toFixed(3)} د.أ</Text>
                    </View>
                  )}
                  {item.headway_min && (
                    <View style={styles.headwayBadge}>
                      <MaterialCommunityIcons name="timer-sand" size={10} color={COLORS.textSecondary} />
                      <Text style={styles.headwayText}>كل {item.headway_min} دقيقة</Text>
                    </View>
                  )}
                </View>

                {/* Occupancy indicator */}
                {item.vehicleOccupancy && (
                  <View style={styles.occupancyRow}>
                    {getOccupancyIcon(item.vehicleOccupancy)}
                    <Text style={styles.occupancyText}>
                      {item.vehicleOccupancy === 'empty' ? 'فارغ' : item.vehicleOccupancy === 'partial' ? 'متوسط' : 'ممتلئ'}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        }}
        ListFooterComponent={<View style={{ height: 40 }} />}
      />
    </SafeAreaView>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString('ar-JO', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return iso;
  }
}

function getDefaultInstruction(leg: JourneyLeg): string {
  if (leg.mode === 'walking') {
    return `امشِ ${leg.duration_min} دقيقة (${(leg.distance_km || 0).toFixed(1)} كم)`;
  }
  const route = leg.routeName_ar || leg.routeCode || 'الخط';
  const from = leg.fromStop?.name_ar || '';
  const to = leg.toStop?.name_ar || '';
  return `اركب ${route} من ${from} إلى ${to}`;
}

function getOccupancyIcon(occupancy: string) {
  const color = occupancy === 'full' ? '#EF4444' : occupancy === 'partial' ? '#F59E0B' : '#10B981';
  const icon = occupancy === 'full' ? 'bus-multiple' : 'bus';
  return <MaterialCommunityIcons name={icon as any} size={14} color={color} />;
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  listContent: { paddingBottom: 20 },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { fontSize: 16, color: '#9CA3AF', fontWeight: '600' },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16,
    padding: 18, alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  summaryRoute: { fontSize: 18, fontWeight: '800', color: COLORS.text },
  summaryStats: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  summaryStat: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryStatValue: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  summaryDivider: { width: 1, height: 18, backgroundColor: COLORS.border },
  departureBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.onTime + '12', paddingHorizontal: 14, paddingVertical: 6, borderRadius: 10,
  },
  departureText: { fontSize: 12, fontWeight: '600', color: COLORS.onTime },
  arrivalText: { fontSize: 12, color: COLORS.textSecondary },
  walkBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.walking + '12', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8,
  },
  walkText: { fontSize: 11, color: COLORS.walking, fontWeight: '600' },

  // Section Title
  sectionTitle: {
    fontSize: 16, fontWeight: '800', color: COLORS.text,
    paddingHorizontal: 16, marginBottom: 12,
  },

  // Leg Row
  legRow: { flexDirection: 'row', paddingHorizontal: 20, minHeight: 90 },
  timeline: { alignItems: 'center', width: 16, marginRight: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: '#FFF' },
  timelineDotFirst: { width: 16, height: 16, borderRadius: 8 },
  timelineLine: { width: 3, flex: 1, marginVertical: 2, borderRadius: 2 },

  // Leg Card
  legCard: {
    flex: 1, backgroundColor: '#FFFFFF', borderRadius: 12,
    padding: 14, marginBottom: 10,
    borderRightWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  legHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  modeBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, gap: 4 },
  modeText: { fontSize: 12, fontWeight: '700' },
  durationBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  durationText: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  // Instruction
  instruction: { fontSize: 14, fontWeight: '600', color: COLORS.text, marginBottom: 8, lineHeight: 20, textAlign: 'right' },

  // Stops
  stopsRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  stopName: { fontSize: 11, color: COLORS.textSecondary },
  stopNameTo: { fontSize: 11, color: COLORS.textSecondary, fontWeight: '600' },

  // Meta
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 4 },
  timeInfo: { flexDirection: 'row', alignItems: 'center' },
  timeText: { fontSize: 11, color: COLORS.textSecondary },
  fareBadge: {
    backgroundColor: COLORS.primary + '15', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  fareText: { fontSize: 12, fontWeight: '700', color: COLORS.primary },
  headwayBadge: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  headwayText: { fontSize: 10, color: COLORS.textSecondary },

  // Occupancy
  occupancyRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  occupancyText: { fontSize: 10, color: COLORS.textSecondary },
});