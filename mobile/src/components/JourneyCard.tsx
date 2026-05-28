// ============================================================================
// دروب (Droob) — JourneyCard Component
// Displays a trip result with mode pills, timeline, duration, and fare
// ============================================================================

import React, { useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, type ViewStyle } from "react-native";
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from "react-native-reanimated";
import { colors, transitColorMap, radius, spacing, fontSize, fontWeight, shadows } from "@theme/tokens";
import type { Journey } from "@types/transit";
import { TransitBadge } from "./TransitBadge";
import { JourneyTimeline } from "./JourneyTimeline";

export interface JourneyCardProps {
  journey: Journey;
  isSelected?: boolean;
  onSelect?: (journey: Journey) => void;
  onStartNavigation?: (journey: Journey) => void;
  style?: ViewStyle;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export const JourneyCard: React.FC<JourneyCardProps> = ({
  journey,
  isSelected = false,
  onSelect,
  onStartNavigation,
  style,
}) => {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.98);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1);
  }, [scale]);

  const departureLabel = (() => {
    const mins = Math.floor(journey.totalDurationMinutes);
    if (mins <= 0) return "الآن";
    return `${mins} دق`;
  })();

  return (
    <AnimatedTouchable
      style={[
        styles.card,
        isSelected && styles.cardSelected,
        style,
        animatedStyle,
      ]}
      onPress={() => onSelect?.(journey)}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel={`رحلة ${journey.legs[0]?.fromStop.nameAr} إلى ${journey.legs[journey.legs.length - 1]?.toStop.nameAr}`}
    >
      {/* Header: Mode pills + Duration + Fare */}
      <View style={styles.header}>
        <View style={styles.modesRow}>
          {journey.modes.map((mode, i) => (
            <TransitBadge key={`${mode}-${i}`} mode={mode} size="sm" />
          ))}
        </View>
        <View style={styles.headerMeta}>
          <Text style={styles.duration}>{departureLabel}</Text>
          {typeof journey.fareAmount === "number" && (
            <Text style={styles.fare}>{journey.fareAmount.toFixed(2)} {journey.fareCurrency}</Text>
          )}
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Timeline */}
      <JourneyTimeline legs={journey.legs} showTimes />

      {/* Footer */}
      <View style={styles.footer}>
        <View style={styles.departureInfo}>
          <Text style={styles.departureLabel}>يغادر خلال</Text>
          <Text style={styles.departureTime}>4 دقائق</Text>
        </View>
        <TouchableOpacity
          style={[styles.startBtn, isSelected && styles.startBtnSelected]}
          onPress={() => onStartNavigation?.(journey)}
          activeOpacity={0.8}
        >
          <Text style={[styles.startBtnText, isSelected && styles.startBtnTextSelected]}>
            ابدأ التنقل
          </Text>
        </TouchableOpacity>
      </View>
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    padding: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardSelected: {
    borderRightWidth: 4,
    borderRightColor: colors.brand_blue,
    backgroundColor: colors.surface_2,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  modesRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  headerMeta: {
    alignItems: "flex-end",
  },
  duration: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[18],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    fontVariant: ["tabular-nums"],
  },
  fare: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.medium,
    color: colors.text_secondary,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[3],
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing[3],
    paddingTop: spacing[3],
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  departureInfo: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  departureLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    color: colors.text_tertiary,
  },
  departureTime: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.bold,
    color: colors.on_time,
  },
  startBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.pill,
    backgroundColor: colors.surface_2,
  },
  startBtnSelected: {
    backgroundColor: colors.brand_blue,
  },
  startBtnText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.text_primary,
  },
  startBtnTextSelected: {
    color: "#FFFFFF",
  },
});

export default JourneyCard;