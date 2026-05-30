// ============================================================================
// دروب (Droob) — OccupancyIndicator Component
// 3 dot segments: empty→1 gray, partial→2 amber, full→3 red
// Arabic labels: فارغ / ممتلئ جزئياً / ممتلئ
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import Animated, { useAnimatedStyle, withTiming, withSequence, withDelay } from "react-native-reanimated";
import { colors, fontSize, fontWeight, spacing } from "@theme/tokens";
import type { OccupancyLevel } from "@/types/transit";

export interface OccupancyIndicatorProps {
  level: OccupancyLevel;
  showLabel?: boolean;
  size?: "sm" | "md";
  style?: ViewStyle;
}

const LEVEL_CONFIG: Record<OccupancyLevel, { filled: number; color: string; labelAr: string }> = {
  empty: { filled: 1, color: colors.on_time, labelAr: "فارغ" },
  partial: { filled: 2, color: colors.delayed, labelAr: "ممتلئ جزئياً" },
  full: { filled: 3, color: colors.cancelled, labelAr: "ممتلئ" },
};

const AnimatedDot: React.FC<{ index: number; isFilled: boolean; color: string; dotSize: number }> = ({ index, isFilled, color, dotSize }) => {
  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: withDelay(index * 100, withTiming(isFilled ? color : colors.border, { duration: 350 })),
    transform: [{ scale: withDelay(index * 100, withSequence(withTiming(isFilled ? 1.2 : 1, { duration: 200 }), withTiming(1, { duration: 150 }))) }],
  }));
  return <Animated.View style={[styles.dot, { width: dotSize, height: dotSize, borderRadius: dotSize / 2 }, animatedStyle]} />;
};

export const OccupancyIndicator: React.FC<OccupancyIndicatorProps> = ({ level, showLabel = true, size = "md", style }) => {
  const config = LEVEL_CONFIG[level];
  const dotSize = size === "sm" ? 8 : 12;
  const gap = size === "sm" ? 3 : 4;
  return (
    <View style={[styles.container, style]} accessibilityRole="text" accessibilityLabel={config.labelAr}>
      <View style={[styles.dots, { gap }]}>
        {[0, 1, 2].map((i) => (<AnimatedDot key={i} index={i} isFilled={i < config.filled} color={config.color} dotSize={dotSize} />))}
      </View>
      {showLabel && <Text style={[styles.label, { color: config.color, fontSize: size === "sm" ? fontSize[11] : fontSize[13] }]}>{config.labelAr}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center", gap: spacing[2] },
  dots: { flexDirection: "row", alignItems: "center" },
  dot: { backgroundColor: colors.border },
  label: { fontFamily: "IBM Plex Sans Arabic", fontWeight: fontWeight.medium },
});

export default OccupancyIndicator;
