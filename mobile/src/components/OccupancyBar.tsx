// ============================================================================
// دروب (Droob) — OccupancyBar Component
// 3 segments: empty/partial/full, colored fill animation
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { colors, radius, fontSize, fontWeight } from "@theme/tokens";
import type { OccupancyLevel } from "@types/transit";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface OccupancyBarProps {
  level: OccupancyLevel;
  showLabel?: boolean;
  style?: ViewStyle;
}

// ─── Config ─────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<OccupancyLevel, { segments: number; color: string; labelAr: string }> = {
  empty: { segments: 1, color: colors.on_time, labelAr: "متاح" },
  partial: { segments: 2, color: colors.delayed, labelAr: "نصف ممتلئ" },
  full: { segments: 3, color: colors.cancelled, labelAr: "ممتلئ" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export const OccupancyBar: React.FC<OccupancyBarProps> = ({
  level,
  showLabel = true,
  style,
}) => {
  const config = LEVEL_CONFIG[level];

  return (
    <View style={[styles.container, style]} accessibilityRole="text" accessibilityLabel={config.labelAr}>
      <View style={styles.segments}>
        {[0, 1, 2].map((index) => {
          const isFilled = index < config.segments;
          return (
            <AnimatedSegment
              key={index}
              isFilled={isFilled}
              color={config.color}
            />
          );
        })}
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: config.color }]}>
          {config.labelAr}
        </Text>
      )}
    </View>
  );
};

// ─── Animated Segment ───────────────────────────────────────────────────────

const AnimatedSegment: React.FC<{ isFilled: boolean; color: string }> = ({
  isFilled,
  color,
}) => {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withTiming(isFilled ? color : colors.border, {
      duration: 400,
    }),
    opacity: withTiming(isFilled ? 1 : 0.3, { duration: 400 }),
  }));

  return <Animated.View style={[styles.segment, animatedStyle]} />;
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  segments: {
    flexDirection: "row",
    gap: 2,
  },
  segment: {
    width: 12,
    height: 4,
    borderRadius: radius.sm,
  },
  label: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.medium,
  },
});

export default OccupancyBar;