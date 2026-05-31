// ============================================================================
// دروب (Droob) — Alerts Screen (التنبيهات والتحذيرات)
// Live transit alerts with severity levels, filtering, and mark-as-read
// ============================================================================

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";

// ─── Types ─────────────────────────────────────────────────────────────────
type Severity = "info" | "warning" | "critical";
type FilterKey = "all" | "unread" | "critical";

interface Alert {
  id: string;
  severity: Severity;
  titleAr: string;
  messageAr: string;
  affectedLines: string[];
  affectedStops: string[];
  startsAt: string;
  isRead: boolean;
}

// ─── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_ALERTS: Alert[] = [
  { id:"a1", severity:"critical", titleAr:"توقف باص عمّان السريع", messageAr:"توقف مؤقت لخط الباص السريع بين صويلح ووسط البلد بسبب حادث مروري. الحافلات البديلة متوفرة.", affectedLines:["BRT1"], affectedStops:["صويلح","الرياض","وسط البلد"], startsAt:"2026-05-30T08:00:00", isRead:false },
  { id:"a2", severity:"warning", titleAr:"تأخير على خط 2", messageAr:"تأخير 15-20 دقيقة على خط 2 باتجاه الجامعة بسبب أعمال طرق.", affectedLines:["2"], affectedStops:["الجاردنز","الجامعة"], startsAt:"2026-05-30T09:30:00", isRead:false },
  { id:"a3", severity:"info", titleAr:"تغيير مواعيد الجمعة", messageAr:"مواعيد جديدة ليوم الجمعة على جميع الخطوط. آخر تحديث من هيئة النقل.", affectedLines:["BRT1","2","3"], affectedStops:[], startsAt:"2026-05-29T12:00:00", isRead:true },
  { id:"a4", severity:"warning", titleAr:"ازدحام سرفيس الصويفية", messageAr:"ازدحام شديد على خط سرفيس الصويفية — العبدلي. ينصح باستخدام خط بديل.", affectedLines:["SERV-ABD"], affectedStops:["الصويفية","العبدلي"], startsAt:"2026-05-30T10:00:00", isRead:false },
  { id:"a5", severity:"critical", titleAr:"إغلاق محطة ماركا", messageAr:"إغلاق مؤقت لمجمع ماركا للصيانة. المحطات البديلة: طارق والرصيفة.", affectedLines:[], affectedStops:["مجمع ماركا"], startsAt:"2026-05-30T06:00:00", isRead:false },
];

// ─── Helpers ────────────────────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  try {
    const diffH = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
    if (diffH < 1) return "الآن";
    if (diffH < 24) return `قبل ${diffH} ساعة`;
    return `قبل ${Math.floor(diffH / 24)} يوم`;
  } catch { return ""; }
}

const SEVERITY_CONFIG: Record<Severity, { bg: string; border: string; icon: string; label: string }> = {
  critical: { bg: colors.cancelled + "14", border: colors.cancelled, icon: "🚨", label: "حرج" },
  warning: { bg: colors.delayed + "14", border: colors.delayed, icon: "⚠️", label: "تحذير" },
  info: { bg: colors.brand_blue + "14", border: colors.brand_blue, icon: "ℹ️", label: "معلومة" },
};

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "الكل" },
  { key: "unread", label: "غير مقروء" },
  { key: "critical", label: "حرج" },
];

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────
export default function AlertsScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [alerts, setAlerts] = useState<Alert[]>(MOCK_ALERTS);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [refreshing, setRefreshing] = useState(false);

  const filtered = alerts.filter((a) => {
    if (filter === "unread") return !a.isRead;
    if (filter === "critical") return a.severity === "critical";
    return true;
  });

  const markRead = useCallback((id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, isRead: true } : a)));
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => prev.map((a) => ({ ...a, isRead: true })));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  const unreadCount = alerts.filter((a) => !a.isRead).length;

  return (
    <ErrorBoundary>
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>التنبيهات</Text>
          {unreadCount > 0 ? (
            <TouchableOpacity onPress={markAllRead} style={styles.markAllBtn}>
              <Text style={styles.markAllText}>تعليم الكل مقروء</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerBtn} />
          )}
        </View>

        {/* Filters */}
        <View style={styles.filterRow}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterPill, filter === f.key && styles.filterPillActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.key === "unread" ? `${f.label} (${unreadCount})` : f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand_blue]} />}
          renderItem={({ item }) => {
            const cfg = SEVERITY_CONFIG[item.severity];
            return (
              <TouchableOpacity
                style={[styles.card, { borderRightColor: cfg.border, borderRightWidth: item.isRead ? 0 : 4 }]}
                onPress={() => markRead(item.id)}
                activeOpacity={0.7}
              >
                <View style={styles.cardHeader}>
                  <View style={[styles.severityBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={styles.severityIcon}>{cfg.icon}</Text>
                    <Text style={[styles.severityLabel, { color: cfg.border }]}>{cfg.label}</Text>
                  </View>
                  <Text style={styles.time}>{formatRelativeTime(item.startsAt)}</Text>
                </View>
                <Text style={[styles.cardTitle, !item.isRead && styles.cardTitleBold]}>
                  {item.titleAr}
                </Text>
                <Text style={styles.cardMessage} numberOfLines={3}>{item.messageAr}</Text>
                {item.affectedLines.length > 0 && (
                  <View style={styles.affectedRow}>
                    {item.affectedLines.map((line) => (
                      <View key={line} style={styles.lineTag}>
                        <Text style={styles.lineTagText}>{line}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>✅</Text>
              <Text style={styles.emptyTitle}>لا توجد تنبيهات</Text>
              <Text style={styles.emptyHint}>جميع الخطوط تعمل بشكل طبيعي</Text>
            </View>
          }
        />
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface_2 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing[4], paddingVertical: spacing[3] },
  headerBtn: { width: layout.touchTarget, height: layout.touchTarget, alignItems: "center", justifyContent: "center" },
  backIcon: { fontSize: 22, color: colors.text_primary },
  title: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[20], fontWeight: fontWeight.bold, color: colors.text_primary },
  markAllBtn: { paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.pill, backgroundColor: colors.surface },
  markAllText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.brand_blue, fontWeight: fontWeight.medium },

  filterRow: { flexDirection: "row", paddingHorizontal: spacing[4], gap: spacing[2], marginBottom: spacing[3] },
  filterPill: { paddingHorizontal: spacing[4], paddingVertical: spacing[1], borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  filterPillActive: { backgroundColor: colors.brand_blue, borderColor: colors.brand_blue },
  filterText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium, color: colors.text_secondary },
  filterTextActive: { color: colors.white },

  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing[4], marginBottom: spacing[2], ...shadows.sm, borderRightWidth: 4, borderRightColor: "transparent" },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing[2] },
  severityBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.input, gap: 4 },
  severityIcon: { fontSize: 12 },
  severityLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], fontWeight: fontWeight.bold },
  time: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary },
  cardTitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], color: colors.text_primary, marginBottom: spacing[1] },
  cardTitleBold: { fontWeight: fontWeight.bold },
  cardMessage: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, lineHeight: 20, textAlign: "right" },
  affectedRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[1], marginTop: spacing[2] },
  lineTag: { backgroundColor: colors.surface_3, paddingHorizontal: spacing[2], paddingVertical: 1, borderRadius: radius.input },
  lineTagText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_secondary, fontWeight: fontWeight.medium },

  emptyState: { alignItems: "center", paddingTop: 64 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary, marginBottom: 4 },
  emptyHint: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_tertiary },
});
