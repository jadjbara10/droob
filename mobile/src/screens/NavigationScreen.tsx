// ============================================================================
// دروب (Droob) — Navigation Screen (التنقل المباشر)
// Active trip navigation: ETA bar, progress, step-by-step instructions
// ============================================================================

import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { TransitBadge } from "@components/TransitBadge";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { TransportMode } from "@/types/transit.types";

interface TripStep { mode: TransportMode | "walking"; lineCode?: string; instruction: string; fromStop: string; toStop: string; durationMin: number; isCompleted: boolean; }

const MOCK_TRIP = {
  eta: 22, progress: 0.35,
  currentInstruction: "انزل في المحطة التالية: دوار الواحة",
  nextInstruction: "استقل باص المدينة خط 6 باتجاه ماركا",
  steps: [
    { mode:"brt" as TransportMode, lineCode:"BRT1", instruction:"اركب باص عمّان السريع من صويلح", fromStop:"صويلح", toStop:"دوار الواحة", durationMin:12, isCompleted:true },
    { mode:"walking" as const, instruction:"امشِ إلى محطة دوار الواحة (100 متر)", fromStop:"دوار الواحة", toStop:"دوار الواحة", durationMin:2, isCompleted:false },
    { mode:"city_bus" as TransportMode, lineCode:"6", instruction:"استقل باص المدينة خط 6 باتجاه ماركا", fromStop:"دوار الواحة", toStop:"وسط البلد", durationMin:8, isCompleted:false },
  ],
};

function toTransitMode(m: TransportMode | "walking"): TransitMode | "walking" { return m === "walking" ? "walking" : m; }

export default function NavigationScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [trip] = useState(MOCK_TRIP);
  const [eta, setEta] = useState(trip.eta);

  useEffect(() => {
    const interval = setInterval(() => setEta((prev) => Math.max(0, prev - 1 / 60)), 1000);
    return () => clearInterval(interval);
  }, []);

  const currentStep = trip.steps.find((s) => !s.isCompleted) || trip.steps[0];

  return (
    <ErrorBoundary>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Top Bar */}
        <View style={styles.topBar}>
          <View style={styles.topBarContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
              <Text style={styles.closeIcon}>✕</Text>
            </TouchableOpacity>
            <View style={styles.etaBox}>
              <Text style={styles.etaLabel}>الوصول خلال</Text>
              <Text style={styles.etaValue}>{Math.ceil(eta)} دقيقة</Text>
            </View>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${trip.progress * 100}%` }]} />
            </View>
          </View>
        </View>

        {/* Map Placeholder */}
        <View style={styles.mapArea}>
          <Text style={styles.mapEmoji}>🗺️</Text>
          <View style={styles.mapBadge}>
            <Text style={styles.mapBadgeText}>📍 {currentStep?.fromStop || "مسار الرحلة"}</Text>
          </View>
        </View>

        {/* Instruction Card */}
        <View style={styles.instructionCard}>
          <View style={styles.instructionHeader}>
            <View style={styles.directionBadge}>
              <Text style={styles.directionArrow}>↑</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.instructionLabel}>الخطوة التالية</Text>
              <Text style={styles.instructionText}>{trip.currentInstruction}</Text>
            </View>
          </View>
          <View style={styles.nextStep}>
            <Text style={styles.nextLabel}>بعد ذلك</Text>
            <Text style={styles.nextText}>{trip.nextInstruction}</Text>
          </View>
        </View>

        {/* Steps */}
        <ScrollView style={styles.stepsList} contentContainerStyle={{ paddingBottom: spacing[8] }}>
          {trip.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, step.isCompleted && styles.stepDotDone]}>
                <Text style={[styles.stepDotText, step.isCompleted && styles.stepDotTextDone]}>
                  {step.isCompleted ? "✓" : i + 1}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <TransitBadge mode={toTransitMode(step.mode)} code={step.lineCode} size="sm" />
                <Text style={[styles.stepText, step.isCompleted && { color: colors.text_tertiary }]}>{step.instruction}</Text>
              </View>
              <Text style={styles.stepTime}>{step.durationMin} دق</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  topBar: { backgroundColor: colors.brand_blue, borderBottomLeftRadius: radius.modal, borderBottomRightRadius: radius.modal },
  topBarContent: { paddingHorizontal: spacing[4], paddingVertical: spacing[4] },
  closeBtn: { position: "absolute", top: 8, left: 8, zIndex: 1, width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.25)", alignItems: "center", justifyContent: "center" },
  closeIcon: { fontSize: 14, color: colors.white, fontWeight: fontWeight.bold },
  etaBox: { alignItems: "center", paddingVertical: spacing[2] },
  etaLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: "rgba(255,255,255,0.8)" },
  etaValue: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[28], fontWeight: fontWeight.bold, color: colors.white },
  progressBar: { height: 3, backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 2, marginTop: spacing[3] },
  progressFill: { height: 3, backgroundColor: colors.gold_accent, borderRadius: 2 },

  mapArea: { height: 180, backgroundColor: colors.surface_2, alignItems: "center", justifyContent: "center" },
  mapEmoji: { fontSize: 48 },
  mapBadge: { position: "absolute", bottom: spacing[3], backgroundColor: colors.surface, paddingHorizontal: spacing[4], paddingVertical: spacing[2], borderRadius: radius.pill, ...shadows.md },
  mapBadgeText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.medium, color: colors.text_primary },

  instructionCard: { backgroundColor: colors.surface, marginHorizontal: spacing[4], marginTop: -spacing[6], borderRadius: radius.card, padding: spacing[4], ...shadows.lg, zIndex: 1 },
  instructionHeader: { flexDirection: "row", gap: spacing[3], alignItems: "center", marginBottom: spacing[3] },
  directionBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.brand_blue, alignItems: "center", justifyContent: "center" },
  directionArrow: { fontSize: 20, color: colors.white, fontWeight: fontWeight.bold },
  instructionLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary, marginBottom: 2 },
  instructionText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.bold, color: colors.text_primary, lineHeight: 22 },
  nextStep: { backgroundColor: colors.surface_2, borderRadius: radius.input, padding: spacing[3] },
  nextLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary, marginBottom: 2 },
  nextText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary },

  stepsList: { flex: 1, padding: spacing[4] },
  stepRow: { flexDirection: "row", gap: spacing[3], marginBottom: spacing[3], alignItems: "flex-start" },
  stepDot: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  stepDotDone: { borderColor: colors.on_time, backgroundColor: colors.on_time },
  stepDotText: { fontSize: 12, color: colors.text_secondary },
  stepDotTextDone: { color: colors.white, fontWeight: fontWeight.bold },
  stepText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_primary, marginTop: 2 },
  stepTime: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_secondary, marginTop: 2 },
});
