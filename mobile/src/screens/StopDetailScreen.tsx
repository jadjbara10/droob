// ============================================================================
// دروب (Droob) — Stop Detail Screen (تفاصيل المحطة)
// Shows stop info, departures board, routes serving this stop, amenities
// ============================================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/transport.config';

interface Departure {
  id: string;
  lineCode: string;
  lineType: 'city' | 'brt' | 'serveece' | 'intercity';
  destination: string;
  scheduled: string;  // "09:45"
  expected: string;   // "09:50"
  status: 'on-time' | 'delayed' | 'cancelled';
  occupancy: 'low' | 'medium' | 'high';
  fare: string;
}

const MOCK_DEPARTURES: Departure[] = [
  { id: 'd1', lineCode: 'BRT1', lineType: 'brt', destination: 'صويلح', scheduled: '٠٩:٤٥', expected: '٠٩:٤٨', status: 'on-time', occupancy: 'medium', fare: '٠.٥٠' },
  { id: 'd2', lineCode: '2', lineType: 'city', destination: 'المطار', scheduled: '٠٩:٥٠', expected: '٠٩:٥٥', status: 'delayed', occupancy: 'high', fare: '٠.٣٥' },
  { id: 'd3', lineCode: 'BRT1', lineType: 'brt', destination: 'صويلح', scheduled: '٠٩:٥٨', expected: '٠٩:٥٨', status: 'on-time', occupancy: 'low', fare: '٠.٥٠' },
  { id: 'd4', lineCode: '23', lineType: 'city', destination: 'الزرقاء', scheduled: '١٠:٠٥', expected: '١٠:٠٥', status: 'on-time', occupancy: 'medium', fare: '٠.٣٥' },
  { id: 'd5', lineCode: 'SERV-SW', lineType: 'serveece', destination: 'صويلح', scheduled: '—', expected: '٢-٨ دق', status: 'on-time', occupancy: 'low', fare: '٠.٣٠-٠.٤٠' },
];

function getTypeColor(type: Departure['lineType']) {
  switch (type) {
    case 'city': return COLORS.cityBus;
    case 'brt': return COLORS.brt;
    case 'serveece': return COLORS.serveece;
    case 'intercity': return COLORS.intercity;
  }
}

function getStatusConfig(status: Departure['status']) {
  switch (status) {
    case 'on-time': return { color: COLORS.onTime, label: 'في الموعد', icon: 'check-circle' as const };
    case 'delayed': return { color: COLORS.delayed, label: 'متأخر', icon: 'clock-alert-outline' as const };
    case 'cancelled': return { color: COLORS.cancelled, label: 'ملغي', icon: 'close-circle' as const };
  }
}

function getOccupancyConfig(occ: Departure['occupancy']) {
  switch (occ) {
    case 'low': return { emoji: '🟢', label: 'فارغ' };
    case 'medium': return { emoji: '🟡', label: 'ممتلئ جزئياً' };
    case 'high': return { emoji: '🔴', label: 'ممتلئ' };
  }
}

export default function StopDetailScreen() {
  const [refreshing, setRefreshing] = useState(false);
  const stopName = 'دوار الداخلية';
  const stopNameEn = 'Interior Circle';
  const stopId = 'stop-004';

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const renderDeparture = useCallback(({ item }: { item: Departure }) => {
    const sc = getStatusConfig(item.status);
    const oc = getOccupancyConfig(item.occupancy);
    const tc = getTypeColor(item.lineType);

    return (
      <View style={styles.departureCard}>
        {/* Line badge */}
        <View style={[styles.lineBadge, { backgroundColor: tc }]}>
          <Text style={styles.lineBadgeText}>{item.lineCode}</Text>
        </View>
        {/* Info */}
        <View style={styles.departureInfo}>
          <Text style={styles.destination}>{item.destination}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.scheduledTime}>{item.scheduled}</Text>
            {item.status === 'delayed' && (
              <Text style={styles.expectedTime}>← {item.expected}</Text>
            )}
            <Text style={styles.fareText}>{item.fare} د.أ</Text>
          </View>
        </View>
        {/* Status & Occupancy */}
        <View style={styles.statusColumn}>
          <View style={[styles.statusBadge, { backgroundColor: sc.color + '20' }]}>
            <MaterialCommunityIcons name={sc.icon} size={14} color={sc.color} />
            <Text style={[styles.statusText, { color: sc.color }]}>{sc.label}</Text>
          </View>
          <Text style={styles.occupancyEmoji}>{oc.emoji}</Text>
        </View>
      </View>
    );
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <FlatList
        data={MOCK_DEPARTURES}
        keyExtractor={item => item.id}
        renderItem={renderDeparture}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        ListHeaderComponent={
          <View>
            {/* Stop Info Card */}
            <View style={styles.stopCard}>
              <View style={styles.stopHeader}>
                <View style={styles.stopIcon}>
                  <MaterialCommunityIcons name="bus-stop-covered" size={28} color={COLORS.primary} />
                </View>
                <View style={styles.stopTitleArea}>
                  <Text style={styles.stopName}>{stopName}</Text>
                  <Text style={styles.stopNameEn}>{stopNameEn}</Text>
                  <Text style={styles.stopId}># {stopId}</Text>
                </View>
              </View>
              {/* Amenities */}
              <View style={styles.amenitiesRow}>
                {[
                  { icon: 'umbrella' as const, label: 'مظلة' },
                  { icon: 'lightbulb-on-outline' as const, label: 'إضاءة' },
                  { icon: 'wheelchair-accessibility' as const, label: 'ذوي الاحتياجات' },
                  { icon: 'bench' as const, label: 'مقاعد' },
                ].map((a, i) => (
                  <View key={i} style={styles.amenityItem}>
                    <MaterialCommunityIcons name={a.icon} size={18} color={COLORS.onTime} />
                    <Text style={styles.amenityLabel}>{a.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Save + Notify row */}
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionBtn}>
                <MaterialCommunityIcons name="bookmark-outline" size={18} color={COLORS.primary} />
                <Text style={styles.actionText}>حفظ المحطة</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.actionBtn, styles.actionBtnPrimary]}>
                <MaterialCommunityIcons name="bell-ring-outline" size={18} color="#FFF" />
                <Text style={styles.actionTextPrimary}>تنبيهني</Text>
              </TouchableOpacity>
            </View>

            {/* Section header */}
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>لوحة المغادرات القادمة</Text>
              <Text style={styles.sectionSubtext}>آخر تحديث: الآن</Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bus-clock" size={48} color={COLORS.textSecondary} />
            <Text style={styles.emptyText}>لا توجد رحلات قادمة</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  listContent: { paddingBottom: 40 },
  // Stop info card
  stopCard: {
    backgroundColor: '#FFFFFF', margin: 16, borderRadius: 16, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 6, elevation: 2,
  },
  stopHeader: { flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 14 },
  stopIcon: {
    width: 50, height: 50, borderRadius: 14,
    backgroundColor: COLORS.primary + '12', alignItems: 'center', justifyContent: 'center',
  },
  stopTitleArea: { flex: 1, gap: 2 },
  stopName: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  stopNameEn: { fontSize: 13, color: COLORS.textSecondary },
  stopId: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2 },
  amenitiesRow: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 8, borderTopWidth: 1, borderTopColor: '#F3F4F6' },
  amenityItem: { alignItems: 'center', gap: 4 },
  amenityLabel: { fontSize: 10, color: COLORS.textSecondary },
  // Actions
  actionsRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10, marginBottom: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 12, backgroundColor: '#FFFFFF',
    gap: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  actionBtnPrimary: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  actionText: { fontSize: 13, fontWeight: '700', color: COLORS.primary },
  actionTextPrimary: { fontSize: 13, fontWeight: '700', color: '#FFFFFF' },
  // Section
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 16, marginTop: 8, marginBottom: 10,
  },
  sectionTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text },
  sectionSubtext: { fontSize: 11, color: COLORS.textSecondary },
  // Departure card
  departureCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 2, elevation: 1,
  },
  lineBadge: {
    width: 44, height: 44, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
  },
  lineBadgeText: { fontSize: 13, fontWeight: '800', color: '#FFF' },
  departureInfo: { flex: 1, gap: 4 },
  destination: { fontSize: 15, fontWeight: '700', color: COLORS.text },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scheduledTime: { fontSize: 13, fontWeight: '600', color: COLORS.text },
  expectedTime: { fontSize: 12, color: COLORS.delayed, fontWeight: '600' },
  fareText: { fontSize: 11, color: COLORS.textSecondary },
  statusColumn: { alignItems: 'flex-end', gap: 6 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, gap: 4 },
  statusText: { fontSize: 10, fontWeight: '700' },
  occupancyEmoji: { fontSize: 14 },
  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: 60, gap: 8 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});