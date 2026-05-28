// ============================================================================
// دروب (Droob) — CountdownTimer Component
// Live ticking with native-driver color transitions: green→amber→red→pulse
// Shows "الآن" with pulse animation when 0
// ============================================================================

import React, { useEffect, useRef } from "react";
import { Text, StyleSheet, type TextProps } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { colors, fontSize, fontWeight } from "@theme/tokens";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CountdownTimerProps {
  minutes: number;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
  onReachZero?: () => void;
  style?: TextProps["style"];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const getColor = (minutes: number): string => {
  if (minutes <= 0) return colors.on_time;
  if (minutes < 2) return colors.cancelled;
  if (minutes <= 5) return colors.delayed;
  return colors.on_time;
};

const formatTime = (minutes: number): { label: string; isNow: boolean } => {
  if (minutes <= 0) return { label: "الآن", isNow: true };
  const mins = Math.floor(minutes);
  const secs = Math.round((minutes - mins) * 60);
  if (mins > 0) return { label: `${mins} دق`, isNow: false };
  if (secs > 0) return { label: `${secs} ث`, isNow: false };
  return { label: "الآن", isNow: true };
};

// ─── Component ──────────────────────────────────────────────────────────────

export const CountdownTimer: React.FC<CountdownTimerProps> = ({
  minutes,
  showLabel = false,
  size = "md",
  onReachZero,
  style,
}) => {
  const opacity = useSharedValue(1);
  const colorProgress = useSharedValue(0);
  const nowCalled = useRef(false);

  useEffect(() => {
    const targetColor =
      minutes <= 0 ? 0 : minutes < 2 ? 2 : minutes <= 5 ? 1 : 0;
    colorProgress.value = withTiming(targetColor, { duration: 500 });
  }, [minutes, colorProgress]);

  useEffect(() => {
    if (minutes <= 0 && !nowCalled.current) {
      nowCalled.current = true;
      opacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 400 }),
          withTiming(1, { duration: 400 })
        ),
        3,
        false,
        () => {
          opacity.value = withTiming(1, { duration: 200 });
          if (onReachZero) runOnJS(handleZero)();
        }
      );
    } else if (minutes > 0) {
      nowCalled.current = false;
      opacity.value = withTiming(1, { duration: 200 });
    }
  }, [minutes]);

  const handleZero = () => onReachZero?.();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  const { label, isNow } = formatTime(minutes);
  const textColor = getColor(minutes);

  const sizeStyles = {
    sm: { fontSize: fontSize[16], fontWeight: fontWeight.semiBold },
    md: { fontSize: fontSize[22], fontWeight: fontWeight.bold },
    lg: { fontSize: fontSize[48], fontWeight: fontWeight.bold },
  };

  return (
    <Animated.View style={[styles.container, animatedStyle]}>
      <Text
        style={[styles.time, sizeStyles[size], { color: textColor }, style]}
        accessibilityRole="text"
        accessibilityLabel={isNow ? "الآن" : `${Math.floor(minutes)} دقائق`}
      >
        {label}
      </Text>
      {showLabel && (
        <Text style={[styles.label, { color: colors.text_tertiary }]}>
          متبقي
        </Text>
      )}
    </Animated.View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  },
  time: {
    fontFamily: "IBM Plex Sans Arabic",
    fontVariant: ["tabular-nums"],
  },
  label: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.regular,
  },
});

export default CountdownTimer;
