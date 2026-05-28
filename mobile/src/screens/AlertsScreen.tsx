// ============================================================================
// دروب (Droob) — Alerts Screen (التنبيهات والتحذيرات)
// Live transit alerts: delays, route changes, station closures
// ============================================================================
import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/transport.config';

// ─── Types ───────────────────────────────────────────────────────────────────
type AlertSeverity = 'info' | 'warning' | 'critical';
type AlertType = 'delay' | 'diversion' | 'closure' | 'emergency' | 'maintenance' | 'strike';

interface TransitAlert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  affectedLines: string[];
  affectedStops: string[];
  timestamp: string;
  expiresAt: string;
  isRead: boolean;
}

// ─── Mock Alerts Data (would come from WebSocket: room alerts:amman) ─────────
const MOCK_ALERTS: TransitAlert[] = [
  {
    id: 'alert1', type: 'delay', severity: 'warning',
    title: 'تأخير على خط الباص السريع BRT1',
    message: 'تأخير ١٢ دقيقة بسبب ازدحام مروري في منطقة الجاردنز. الوقت المتوقع للعودة للجدول: ٠٩:٣٠',
    affectedLines: ['BRT1'], affectedStops: ['مجمع الجاردنز', 'دوار الداخلية'],
    timestamp: '2026-05-24T09:20:00+03:00', expiresAt: '2026-05-24T10:00:00+03:00',
    isRead: false,
  },
  {
    id: 'alert2', type: 'diversion', severity: 'warning',
    title: 'تحويل مسار خط ٢٣ — دوار المحكمة',
    message: 'تم تحويل مسار خط ٢٣ مؤقتاً بسبب أعمال صيانة في دوار المحكمة. المحطات البديلة: دوار الداخلية، شارع مكة.',
    affectedLines: ['23'], affectedStops: ['دوار المحكمة'],
    timestamp: '2026-05-24T08:00:00+03:00', expiresAt: '2026-05-24T16:00:00+03:00',
    isRead: false,
  },
  {
    id: 'alert3', type: 'closure', severity: 'critical',
    title: 'إغلاق محطة العبدلي — صيانة عاجلة',
    message: 'محطة العبدلي المركزية مغلقة للصيانة من الساعة ١٠ صباحاً حتى ٢ ظهراً. يرجى استخدام محطة المهاجرين البديلة.',
    affectedLines: ['BRT1', '2', '5'], affectedStops: ['العبدلي'],
    timestamp: '2026-05-24T07:30:00+03:00', expiresAt: '2026-05-24T14:00:00+03:00',
    isRead: true,
  },
  {
    id: 'alert4', type: 'delay', severity: 'info',
    title: 'تأخير بسيط على خط ٣٥',
    message: 'تأخير ٥ دقائق على خط ٣٥ (وادي السير → الدوار الأول) بسبب كثافة الركاب.',
    affectedLines: ['35'], affectedStops: [],
    timestamp: '2026-05-24T09:00:00+03:00', expiresAt: '2026-05-24T09:30:00+03:00',
    isRead: true,
  },
  {
    id: 'alert5', type: 'maintenance', severity: 'info',
    title: 'صيانة مجدولة — خط سرفيس العبدلي-صويلح',
    message: 'صيانة دورية مجدولة لأسطول سرفيس العبدلي-صويلح. انخفاض عدد المركبات المتاحة بنسبة ٣٠٪ حتى الساعة ١٢ ظهراً.',
    affectedLines: ['SERV-ABD-SWE'], affectedStops: [],
    timestamp: '2026-05-24T06:00:00+03:00', expiresAt: '2026-05-24T12:00:00+03:00',
    isRead: true,
  },
  {
    id: 'alert6', type: 'emergency', severity: 'critical',
    title: '⚠️ تنبيه أمان — منطقة ماركا',
    message: 'تم إيقاف جميع خطوط الباصات المتجهة إلى ماركا مؤقتاً بسبب حادث مروري. يرجى استخدام طرق بديلة.',
    affectedLines: ['23', '35', 'SERV-MAR-HAS'], affectedStops: ['مجمع ماركا', 'الهاشمي الشمالي'],
    timestamp: '2026-05-24T09:45:00+03:00', expiresAt: '2026-05-24T11:30:00+03:00',
    isRead: false,
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getAlertTypeIcon(type: AlertType): keyof typeof MaterialCommunityIcons.glyphMap {
  switch (type) {
    case 'delay': return 'clock-alert-outline';
    case 'diversion': return 'routes';
    case 'closure': return 'cancel';
    case 'emergency': return 'alert-octagon';
    case 'maintenance': return 'wrench-outline';
    case 'strike': return 'account-cancel-outline';
    default: return 'alert-circle-outline';
  }
}

function getSeverityConfig(severity: AlertSeverity) {
  switch (severity) {
    case 'critical': return { bg: '#FEF2F2', border: '#DC2626', text: '#991B1B', label: 'حرج' };
    case 'warning': return { bg: '#FFFBEB', border: '#F59E0B', text: '#92400E', label: 'تحذير' };
    case 'info': return { bg: '#EFF6FF', border: '#3B82F6', text: '#1E40AF', label: 'إشعار' };
  }
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'الآن';
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  return `قبل ${hours} ساعات`;
}

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AlertsScreen() {
  const [alerts, setAlerts] = useState(MOCK_ALERTS);
  const [filter, setFilter] = useState<'all' | 'unread' | 'critical'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise(r => setTimeout(r, 800));
    setRefreshing(false);
  }, []);

  const markAsRead = useCallback((id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, isRead: true } : a));
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts(prev => prev.map(a => ({ ...a, isRead: true })));
  }, []);

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'unread') return !a.isRead;
    if (filter === 'critical') return a.severity === 'critical';
    return true;
  });

  const unreadCount = alerts.filter(a => !a.isRead).length;
  const criticalCount = alerts.filter(a => a.severity === 'critical').length;

  // ─── Render single alert ───────────────────────────────────────────────
  const renderAlert = useCallback(({ item }: { item: TransitAlert }) => {
    const sc = getSeverityConfig(item.severity);
    const typeIcon = getAlertTypeIcon(item.type);

    return (
      <TouchableOpacity
        style={[styles.alertCard, { borderRightColor: sc.border }, !item.isRead && styles.alertUnread]}
        activeOpacity={0.7}
        onPress={() => markAsRead(item.id)}
      >
        {/* Header */}
        <View style={styles.alertHeader}>
          <View style={styles.alertMetaLeft}>
            <View style={[styles.severityBadge, { backgroundColor: sc.border + '20' }]}>
              <Text style={[styles.severityText, { color: sc.border }]}>{sc.label}</Text>
            </View>
            <Text style={styles.alertTime}>{formatTime(item.timestamp)}</Text>
          </View>
          {!item.isRead && <View style={styles.unreadDot} />}
        </View>

        {/* Title */}
        <View style={styles.alertTitleRow}>
          <MaterialCommunityIcons name={typeIcon} size={18} color={sc.border} />
          <Text style={styles.alertTitle} numberOfLines={2}>{item.title}</Text>
        </View>

        {/* Message (collapsed preview) */}
        <Text style={styles.alertMessage} numberOfLines={3}>{item.message}</Text>

        {/* Affected Lines */}
        {item.affectedLines.length > 0 && (
          <View style={styles.affectedRow}>
            <MaterialCommunityIcons name="bus-side" size={13} color={COLORS.textSecondary} />
            <View style={styles.lineBadges}>
              {item.affectedLines.map((line, i) => (
                <View key={i} style={styles.lineBadge}>
                  <Text style={styles.lineBadgeText}>{line}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Affected Stops */}
        {item.affectedStops.length > 0 && (
          <View style={styles.affectedRow}>
            <MaterialCommunityIcons name="map-marker" size={13} color={COLORS.textSecondary} />
            <Text style={styles.affectedText} numberOfLines={1}>
              {item.affectedStops.join(' · ')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [markAsRead]);

  // ─── Main Render ───────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>التنبيهات</Text>
          {unreadCount > 0 && (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>تعليم الكل كمقروء</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterPill, filter === 'all' && styles.filterPillActive]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.filterTextActive]}>
            الكل ({alerts.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filter === 'unread' && styles.filterPillActiveUnread]}
          onPress={() => setFilter('unread')}
        >
          <Text style={[styles.filterText, filter === 'unread' && styles.filterTextActive]}>
            غير مقروء ({unreadCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.filterPill, filter === 'critical' && styles.filterPillActiveCritical]}
          onPress={() => setFilter('critical')}
        >
          <MaterialCommunityIcons name="alert-octagon" size={14} color={filter === 'critical' ? '#FFF' : '#DC2626'} />
          <Text style={[styles.filterText, filter === 'critical' && styles.filterTextActive]}>
            حرج ({criticalCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Alert List */}
      <FlatList
        data={filteredAlerts}
        keyExtractor={item => item.id}
        renderItem={renderAlert}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons name="bell-check-outline" size={64} color={COLORS.textSecondary} />
            <Text style={styles.emptyTitle}>لا توجد تنبيهات</Text>
            <Text style={styles.emptySubtitle}>
              {filter === 'unread' ? 'جميع التنبيهات مقروءة' : 'لا توجد تنبيهات حالياً — كل شيء يسير حسب الجدول'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F3F4F6' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.text,
    fontFamily: 'System',
  },
  markAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.primary + '10',
    borderRadius: 8,
  },
  markAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primary,
  },
  // Filter pills
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 5,
    alignItems: 'center',
  },
  filterPillActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterPillActiveUnread: {
    backgroundColor: '#F59E0B',
    borderColor: '#F59E0B',
  },
  filterPillActiveCritical: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  filterText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  // Alert cards
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    borderRightWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
    gap: 8,
  },
  alertUnread: {
    backgroundColor: '#FAFBFC',
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  alertMetaLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  severityText: {
    fontSize: 10,
    fontWeight: '800',
  },
  alertTime: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
  },
  alertTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  alertTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    lineHeight: 22,
  },
  alertMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    paddingRight: 26, // Align with title (icon width + gap)
  },
  affectedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  lineBadges: {
    flexDirection: 'row',
    gap: 4,
    flexWrap: 'wrap',
  },
  lineBadge: {
    backgroundColor: COLORS.primary + '15',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
  },
  lineBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.primary,
  },
  affectedText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});