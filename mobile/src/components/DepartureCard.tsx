// ============================================================================
// دروب (Droob) — Departure Card Component
// Single departure row: line / destination / time / status / occupancy
// ============================================================================
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import TransportIcon from './TransportIcon';
import { COLORS, TRANSPORT_MODES, OCCUPANCY, DEPARTURE_STATUS } from '../config/transport.config';
import type { Departure, TransportMode } from '../types/transit.types';

interface DepartureCardProps {
  departure: Departure;
  onBellPress?: (departure: Departure) => void;
  onSelect?: (departure: Departure) => void;
}

export default function DepartureCard({ departure, onBellPress, onSelect }: DepartureCardProps) {
  const mode = departure.mode as TransportMode;
  const modeConfig = TRANSPORT_MODES[mode];
  const statusConfig = DEPARTURE_STATUS[departure.status] || DEPARTURE_STATUS.on_time;
  const occupancyConfig = departure.occupancy ? OCCUPANCY[departure.occupancy] : null;

  // Format wait time
  const waitText = departure.waitMinutes <= 0
    ? 'يصل الآن'
    : departure.waitMinutes === 1
      ? 'دقيقة ١'
      : `${departure.waitMinutes} دق`;

  // Format fare
  const fareText = typeof departure.fare === 'number'
    ? `${departure.fare.toFixed(3)} د.أ`
    : `${(departure.fare as any).min?.toFixed(2) ?? '0.20'}–${(departure.fare as any).max?.toFixed(2) ?? '0.40'} د.أ`;

  return (
    <TouchableOpacity
      style={[styles.card, { borderRightColor: modeConfig?.color || COLORS.cityBus, borderRightWidth: 4 }]}
      onPress={() => onSelect?.(departure)}
      activeOpacity={0.7}
    >
      {/* ─── Icon Column ─────────────────────────────────────────────── */}
      <View style={styles.iconCol}>
        <TransportIcon mode={mode} code={departure.code} size={32} />
      </View>

      {/* ─── Info Column ──────────────────────────────────────────────── */}
      <View style={styles.infoCol}>
        <View style={styles.topRow}>
          <Text style={styles.routeName} numberOfLines={1}>
            {departure.name_ar}
          </Text>
          <Text style={styles.lineCode}>#{departure.code}</Text>
        </View>

        <View style={styles.metaRow}>
          {/* Status badge */}
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.color + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>
              {statusConfig.label_ar}
            </Text>
          </View>

          {/* Occupancy */}
          {occupancyConfig && (
            <View style={styles.occupancyBadge}>
              <Text style={styles.occupancyText}>
                {occupancyConfig.icon} {occupancyConfig.label_ar}
              </Text>
            </View>
          )}

          {/* Serveece special badge */}
          {mode === 'serveece' && (
            <View style={styles.serveeceBadge}>
              <Text style={styles.serveeceText}>مشترك</Text>
            </View>
          )}
        </View>
      </View>

      {/* ─── Time & Fare Column ─────────────────────────────────────── */}
      <View style={styles.timeCol}>
        <Text style={[styles.waitTime, { color: statusConfig.color }]}>
          {waitText}
        </Text>
        <Text style={styles.fare}>{fareText}</Text>

        {/* Bell button */}
        <TouchableOpacity
          style={styles.bellBtn}
          onPress={() => onBellPress?.(departure)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <MaterialCommunityIcons name="bell-outline" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  iconCol: {
    justifyContent: 'center',
    marginRight: 10,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  routeName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  lineCode: {
    fontSize: 13,
    fontWeight: '800',
    color: COLORS.primary,
    marginLeft: 8,
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  occupancyBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  occupancyText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  },
  serveeceBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: COLORS.serveece + '20',
  },
  serveeceText: {
    fontSize: 10,
    fontWeight: '600',
    color: COLORS.serveece,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  timeCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    marginLeft: 8,
    minWidth: 60,
  },
  waitTime: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  fare: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  bellBtn: {
    marginTop: 6,
    padding: 4,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});