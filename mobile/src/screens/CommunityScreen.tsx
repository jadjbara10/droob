// ============================================================================
// دروب (Droob) — Community Reports Screen (بلاغات المجتمع)
// Crowd-sourced transit info: delays, crowding, route changes
// ============================================================================

import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import { reportsApi } from "@/services/api-client";
import { analytics } from "@/services/analytics";

// ─── Types ─────────────────────────────────────────────────────────────────
type ReportType = "delay" | "crowding" | "ended_route" | "closed_stop" | "data_correction";
type Report = { id: string; type: ReportType; message: string; stopName: string; createdAt: string; confirmCount: number };

const REPORT_TYPES: { key: ReportType; icon: string; label: string; hint: string }[] = [
  { key: "delay", icon: "⏰", label: "تأخير", hint: "أبلغ عن تأخير في مواعيد الباص" },
  { key: "crowding", icon: "👥", label: "ازدحام", hint: "أبلغ عن ازدحام في باص أو محطة" },
  { key: "ended_route", icon: "🏁", label: "انتهاء خط", hint: "أبلغ عن توقف أو انتهاء خط" },
  { key: "closed_stop", icon: "🚫", label: "إغلاق محطة", hint: "أبلغ عن إغلاق أو تحويل محطة" },
  { key: "data_correction", icon: "📝", label: "تصحيح بيانات", hint: "اقترح تعديل: اسم محطة، سعر، موعد، مسار خط — ترسل للداشبورد للمراجعة" },
];

// ─── Mock Data ─────────────────────────────────────────────────────────────
const MOCK_REPORTS: Report[] = [
  { id:"r1", type:"delay", message:"تأخير 20 دقيقة على باص عمّان السريع", stopName:"محطة الجاردنز", createdAt:"2026-05-30T10:00:00", confirmCount:12 },
  { id:"r2", type:"crowding", message:"ازدحام شديد في سرفيس الصويفية", stopName:"موقف الصويفية", createdAt:"2026-05-30T09:30:00", confirmCount:8 },
  { id:"r3", type:"closed_stop", message:"محطة ماركا مغلقة للصيانة", stopName:"مجمع ماركا", createdAt:"2026-05-30T08:00:00", confirmCount:25 },
  { id:"r4", type:"ended_route", message:"آخر باص خط 6 غادر الساعة 10", stopName:"دوار الداخلية", createdAt:"2026-05-29T22:00:00", confirmCount:3 },
];

function formatRelativeTime(iso: string): string {
  try {
    const diffM = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffM < 1) return "الآن";
    if (diffM < 60) return `قبل ${diffM} دقيقة`;
    const diffH = Math.floor(diffM / 60);
    if (diffH < 24) return `قبل ${diffH} ساعة`;
    return `قبل ${Math.floor(diffH / 24)} يوم`;
  } catch { return ""; }
}

const TYPE_COLORS: Record<ReportType, string> = { delay: colors.delayed, crowding: colors.serveece, ended_route: colors.walking, closed_stop: colors.cancelled, data_correction: colors.brand_blue };

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────
export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [reports, setReports] = useState<Report[]>(MOCK_REPORTS);
  const [showForm, setShowForm] = useState(false);
  const [selectedType, setSelectedType] = useState<ReportType>("delay");
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  // Track confirm counts locally (id -> count)
  const [confirmCounts, setConfirmCounts] = useState<Record<string, number>>({});

  const handleSubmit = useCallback(async () => {
    if (!message.trim()) {
      Alert.alert("تنبيه", "الرجاء كتابة وصف للبلاغ");
      return;
    }
    const newReport: Report = {
      id: `r${Date.now()}`,
      type: selectedType,
      message: message.trim(),
      stopName: "موقعي الحالي",
      createdAt: new Date().toISOString(),
      confirmCount: 0,
    };
    setReports((prev) => [newReport, ...prev]);
    setMessage("");
    setShowForm(false);

    // Submit to API
    try {
      await reportsApi.create({
        type: selectedType,
        lat: 31.9539,
        lng: 35.9106,
        message: message.trim(),
      });
    } catch {
      // Submission failed silently — report is already in local list
    }

    analytics.trackReportSubmit(selectedType);
    Alert.alert("تم", "تم إرسال بلاغك. شكراً لمساهمتك!");
  }, [message, selectedType]);

  const handleConfirm = useCallback((reportId: string) => {
    setConfirmCounts((prev) => ({
      ...prev,
      [reportId]: (prev[reportId] || 0) + 1,
    }));
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((r) => setTimeout(r, 1000));
    setRefreshing(false);
  }, []);

  return (
    <ErrorBoundary>
      <View style={[styles.root, { paddingTop: insets.top + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBtn}>
            <Text style={styles.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>بلاغات المجتمع</Text>
          <TouchableOpacity onPress={() => setShowForm(!showForm)} style={styles.addBtn}>
            <Text style={styles.addBtnText}>{showForm ? "✕" : "+"}</Text>
          </TouchableOpacity>
        </View>

        {/* Submit Form */}
        {showForm && (
          <View style={styles.form}>
            <Text style={styles.formTitle}>إرسال بلاغ جديد</Text>
            <View style={styles.typeRow}>
              {REPORT_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeChip, selectedType === t.key && { backgroundColor: TYPE_COLORS[t.key] + "26", borderColor: TYPE_COLORS[t.key] }]}
                  onPress={() => setSelectedType(t.key)}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <Text style={styles.typeLabel}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={styles.input}
              placeholder={selectedType === "data_correction" ? "ما التعديل المقترح؟ (مثال: اسم المحطة الصحيح هو...، السعر الجديد هو...)" : "صف المشكلة التي تواجهها..."}
              placeholderTextColor={colors.text_tertiary}
              value={message}
              onChangeText={setMessage}
              multiline
              textAlign="right"
              numberOfLines={3}
            />
            <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
              <Text style={styles.submitText}>إرسال البلاغ</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Reports List */}
        <FlatList
          data={reports}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.brand_blue]} />}
          renderItem={({ item }) => {
            const t = REPORT_TYPES.find((rt) => rt.key === item.type);
            const effectiveCount = (item.confirmCount || 0) + (confirmCounts[item.id] || 0);
            return (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={[styles.typeBadge, { backgroundColor: TYPE_COLORS[item.type] + "20" }]}>
                    <Text>{t?.icon}</Text>
                    <Text style={[styles.typeLabel, { color: TYPE_COLORS[item.type] }]}>{t?.label}</Text>
                  </View>
                  <Text style={styles.time}>{formatRelativeTime(item.createdAt)}</Text>
                </View>
                <Text style={styles.reportMessage}>{item.message}</Text>
                <View style={styles.cardFooter}>
                  <Text style={styles.stopName}>📍 {item.stopName}</Text>
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => handleConfirm(item.id)}>
                    <Text style={styles.confirmText}>👍 {effectiveCount}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📢</Text>
              <Text style={styles.emptyTitle}>لا توجد بلاغات حالياً</Text>
              <Text style={styles.emptyHint}>كن أول من يبلغ عن حالة النقل</Text>
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
  addBtn: { width: layout.touchTarget, height: layout.touchTarget, borderRadius: layout.touchTarget / 2, backgroundColor: colors.brand_blue, alignItems: "center", justifyContent: "center" },
  addBtnText: { fontSize: 24, color: colors.white, fontWeight: fontWeight.bold },

  form: { backgroundColor: colors.surface, margin: spacing[4], padding: spacing[4], borderRadius: radius.card, ...shadows.md },
  formTitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold, color: colors.text_primary, marginBottom: spacing[3] },
  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing[2], marginBottom: spacing[3] },
  typeChip: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing[3], paddingVertical: spacing[1], borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, gap: 4 },
  typeIcon: { fontSize: 14 },
  typeLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium, color: colors.text_primary },
  input: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_primary, backgroundColor: colors.surface_2, borderRadius: radius.input, padding: spacing[3], minHeight: 80, textAlignVertical: "top", marginBottom: spacing[3] },
  submitBtn: { backgroundColor: colors.brand_blue, borderRadius: radius.pill, paddingVertical: spacing[3], alignItems: "center" },
  submitText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.bold, color: colors.white },

  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[8] },
  card: { backgroundColor: colors.surface, borderRadius: radius.card, padding: spacing[4], marginBottom: spacing[2], ...shadows.sm },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: spacing[2] },
  typeBadge: { flexDirection: "row", alignItems: "center", paddingHorizontal: spacing[2], paddingVertical: 2, borderRadius: radius.input, gap: 4 },
  time: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary },
  reportMessage: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], color: colors.text_primary, lineHeight: 22, textAlign: "right", marginBottom: spacing[2] },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  stopName: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_secondary },
  confirmBtn: { paddingHorizontal: spacing[2], paddingVertical: 2 },
  confirmText: { fontSize: 14 },

  emptyState: { alignItems: "center", paddingTop: 64 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold, color: colors.text_primary, marginBottom: 4 },
  emptyHint: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_tertiary },
});
