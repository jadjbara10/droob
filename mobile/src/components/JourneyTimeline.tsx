// ============================================================================
// دروب (Droob) — JourneyTimeline Component
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, transitColorMap, radius, spacing, fontSize, fontWeight } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { RouteLeg } from "@types/transit";
import { TransitBadge } from "./TransitBadge";

export interface JourneyTimelineProps {
  legs: RouteLeg[];
  showTimes?: boolean;
  style?: ViewStyle;
}

const getModeLineColor = (mode: TransitMode) => transitColorMap[mode] || colors.walking;

export const JourneyTimeline: React.FC<JourneyTimelineProps> = ({ legs, showTimes = true, style }) => {
  if (legs.length === 0) return null;

  return (
    <View style={[styles.container, style]} accessibilityRole="list">
      {legs.map((leg, legIndex) => {
        const lineColor = getModeLineColor(leg.mode);
        const isLast = legIndex === legs.length - 1;
        const showTransfer = !isLast && legs[legIndex + 1].mode !== leg.mode;
        const isWalking = leg.mode === "walking";

        return (
          <View key={`leg-${legIndex}`} style={styles.leg}>
            {/* Track column */}
            <View style={styles.trackColumn}>
              <View style={[styles.stopDot, { borderColor: lineColor, backgroundColor: colors.surface }]} />
              <View
                style={[
                  styles.line,
                  isWalking
                    ? { backgroundColor: "transparent", borderStyle: "dashed", borderColor: lineColor, borderLeftWidth: 2 }
                    : { backgroundColor: lineColor },
                ]}
              />
              {showTransfer ? (
                <View style={[styles.transferCircle]}>
                  <Text style={styles.transferIcon}>⇅</Text>
                </View>
              ) : isLast ? (
                <View style={[styles.stopDot, { borderColor: lineColor, backgroundColor: lineColor }]} />
              ) : null}
            </View>

            {/* Content column */}
            <View style={styles.content}>
              <View style={styles.header}>
                {leg.lineCode ? (
                  <TransitBadge mode={leg.mode} code={leg.lineCode} size="sm" />
                ) : (
                  <TransitBadge mode={leg.mode} size="sm" />
                )}
                <Text style={styles.instruction} numberOfLines={1}>
                  {isWalking ? `مشي ${leg.durationMinutes} دق` : leg.lineNameAr || ""}
                </Text>
                {showTimes && <Text style={styles.duration}>{leg.durationMinutes} دق</Text>}
              </View>
              <View style={styles.stopNames}>
                <Text style={styles.stopName}>{leg.fromStop.nameAr}</Text>
                <Text style={styles.arrow}>→</Text>
                <Text style={styles.stopName}>{leg.toStop.nameAr}</Text>
              </View>
              {leg.intermediateStops > 0 && (
                <Text style={styles.intermediate}>+ {leg.intermediateStops} محطات</Text>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { paddingVertical: spacing[2] },
  leg: { flexDirection: "row", gap: 12, minHeight: 64 },
  trackColumn: { alignItems: "center", width: 24 },
  stopDot: { width: 10, height: 10, borderRadius: 5, borderWidth: 2 },
  line: { width: 2, flex: 1 },
  transferCircle: {
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.surface_3, borderWidth: 1, borderColor: colors.border,
    alignItems: "center", justifyContent: "center",
  },
  transferIcon: { fontSize: 10, color: colors.text_secondary },
  content: { flex: 1, paddingBottom: spacing[3] },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  instruction: {
    flex: 1, fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14], fontWeight: fontWeight.semiBold, color: colors.text_primary,
  },
  duration: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13],
    fontWeight: fontWeight.medium, color: colors.text_secondary,
  },
  stopNames: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  stopName: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13],
    color: colors.text_secondary,
  },
  arrow: { color: colors.text_tertiary, fontSize: fontSize[13] },
  intermediate: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11],
    color: colors.text_tertiary, marginTop: 2,
  },
});