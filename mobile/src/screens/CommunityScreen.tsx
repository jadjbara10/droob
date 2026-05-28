// ============================================================================
// دروب (Droob) — Community Reports Screen
// Crowd-sourced transit info: delays, crowding, route changes
// ============================================================================

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/transport.config';
import { useTransitStore } from '../stores/transit.store';
import apiClient from '../services/api';
import { CommunityReport } from '../types/transit.types';

const REPORT_TYPES: { key: CommunityReport['type']; label: string; icon: string; color: string }[] = [
  { key: 'delay', label: 'تأخير', icon: 'clock-alert-outline', color: '#F59E0B' },
  { key: 'crowding', label: 'ازدحام', icon: 'account-group-outline', color: '#EF4444' },
  { key: 'ended_route', label: 'انتهاء الخط', icon: 'map-marker-off-outline', color: '#6B7280' },
  { key: 'closed_stop', label: 'إغلاق محطة', icon: 'bus-stop-uncovered', color: '#DC2626' },
];

const TYPE_LABELS: Record<string, string> = {
  delay: 'تأخير',
  crowding: 'ازدحام',
  ended_route: 'انتهاء الخط',
  closed_stop: 'إغلاق محطة',
};

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const { userLocation } = useTransitStore();

  const [reports, setReports] = useState<CommunityReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Form state
  const [reportType, setReportType] = useState<CommunityReport['type']>('delay');
  const [reportMsg, setReportMsg] = useState('');

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch active community reports near user
      const data = await apiClient.getStops({ limit: 1 }); // placeholder
      setReports([]);
    } catch {
      // Offline — show empty
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchReports();
    setRefreshing(false);
  }, [fetchReports]);

  const submitReport = async () => {
    if (!reportMsg.trim()) {
      Alert.alert('تنبيه', 'الرجاء كتابة وصف للبلاغ');
      return;
    }
    if (!userLocation) {
      Alert.alert('تنبيه', 'لا يمكن تحديد موقعك الحالي');
      return;
    }
    try {
      await apiClient.createReport({
        type: reportType,
        lat: userLocation.lat,
        lng: userLocation.lng,
        message: reportMsg.trim(),
      });
      Alert.alert('تم', 'تم إرسال البلاغ بنجاح. شكراً لمساهمتك!');
      setShowForm(false);
      setReportMsg('');
      fetchReports();
    } catch {
      Alert.alert('خطأ', 'فشل إرسال البلاغ، حاول مرة أخرى');
    }
  };

  const renderReport = ({ item }: { item: CommunityReport }) => {
    const typeInfo = REPORT_TYPES.find((t) => t.key === item.type);
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.typeBadge, { backgroundColor: (typeInfo?.color || '#6B7280') + '20' }]}>
            <MaterialCommunityIcons
              name={typeInfo?.icon as any || 'alert-outline'}
              size={18}
              color={typeInfo?.color || '#6B7280'}
            />
            <Text style={[styles.typeText, { color: typeInfo?.color || '#6B7280' }]}>
              {TYPE_LABELS[item.type] || item.type}
            </Text>
          </View>
        </View>
        <Text style={styles.reportMessage}>{item.message}</Text>
        <Text style={styles.reportTime}>
          {new Date(item.createdAt).toLocaleString('ar-JO')}
        </Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>المجتمع</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowForm(!showForm)}
        >
          <MaterialCommunityIcons
            name={showForm ? 'close' : 'plus'}
            size={24}
            color="#FFF"
          />
        </TouchableOpacity>
      </View>

      {/* Submit Form */}
      {showForm && (
        <View style={styles.form}>
          <Text style={styles.formTitle}>إرسال بلاغ جديد</Text>

          {/* Type Picker */}
          <View style={styles.typeRow}>
            {REPORT_TYPES.map((t) => (
              <TouchableOpacity
                key={t.key}
                style={[
                  styles.typeChip,
                  reportType === t.key && { backgroundColor: t.color, borderColor: t.color },
                ]}
                onPress={() => setReportType(t.key)}
              >
                <MaterialCommunityIcons
                  name={t.icon as any}
                  size={16}
                  color={reportType === t.key ? '#FFF' : t.color}
                />
                <Text
                  style={[
                    styles.typeChipText,
                    reportType === t.key && { color: '#FFF' },
                  ]}
                >
                  {t.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Message */}
          <TextInput
            style={styles.input}
            placeholder="وصف البلاغ..."
            placeholderTextColor="#9CA3AF"
            multiline
            numberOfLines={3}
            value={reportMsg}
            onChangeText={setReportMsg}
            textAlignVertical="top"
          />

          {/* Submit */}
          <TouchableOpacity style={styles.submitBtn} onPress={submitReport}>
            <Text style={styles.submitText}>إرسال البلاغ</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reports List */}
      {loading ? (
        <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          renderItem={renderReport}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />
          }
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <MaterialCommunityIcons name="shield-check-outline" size={64} color="#D1D5DB" />
              <Text style={styles.emptyTitle}>لا توجد بلاغات حالياً</Text>
              <Text style={styles.emptySubtitle}>
                اضغط على + لإرسال بلاغ عن التأخير أو الازدحام
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#1F2937', textAlign: 'right' },
  addButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  form: {
    marginHorizontal: 16, marginBottom: 16,
    backgroundColor: '#FFF', borderRadius: 16,
    padding: 16, shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06, shadowRadius: 8, elevation: 4,
  },
  formTitle: { fontSize: 16, fontWeight: '700', color: '#1F2937', marginBottom: 12, textAlign: 'right' },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
  },
  typeChipText: { fontSize: 12, fontWeight: '600', color: '#374151' },
  input: {
    borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 12,
    padding: 12, fontSize: 14, color: '#1F2937',
    backgroundColor: '#F9FAFB', minHeight: 80,
    textAlign: 'right',
  },
  submitBtn: {
    marginTop: 12, backgroundColor: COLORS.primary,
    paddingVertical: 14, borderRadius: 12,
    alignItems: 'center',
  },
  submitText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#FFF', borderRadius: 14,
    padding: 16, marginBottom: 12,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  typeText: { fontSize: 12, fontWeight: '700' },
  reportMessage: { fontSize: 14, color: '#374151', lineHeight: 22, textAlign: 'right', marginBottom: 8 },
  reportTime: { fontSize: 11, color: '#9CA3AF', textAlign: 'right' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#9CA3AF', marginTop: 16 },
  emptySubtitle: { fontSize: 14, color: '#D1D5DB', marginTop: 8, textAlign: 'center', paddingHorizontal: 40 },
});