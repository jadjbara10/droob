// ============================================================================
// دروب (Droob) — TransitBadge Component
// Colored rounded rect, mode icon + line code, animated press + haptic
// Sizes: sm (32), md (44), lg (56)
// ============================================================================

import React, { useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, transitColorMap, radius, layout, fontSize, fontWeight, spacing } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";

// ─── Props ──────────────────────────────────────────────────────────────────

export interface TransitBadgeProps {
  mode: TransitMode | "walking";
  code?: string;
  size?: "sm" | "md" | "lg";
  onPress?: () => void;
  style?: ViewStyle;
}

// ─── Mode Icons & Labels ────────────────────────────────────────────────────

const MODE_ICONS: Record<string, string> = {
  city_bus: "🚌",
  brt: "⚡",
  serveece: "🚐",
  intercity: "🚍",
  walking: "🚶",
};

const MODE_LABELS: Record<string, string> = {
  city_bus: "باص",
  brt: "BRT",
  serveece: "سرفيس",
  intercity: "بين",
  walking: "مشي",
};

// ─── Animated Pressable ─────────────────────────────────────────────────────

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// ─── Component ──────────────────────────────────────────────────────────────

export const TransitBadge: React.FC<TransitBadgeProps> = ({
  mode,
  code,
  size = "md",
  onPress,
  style,
}) => {
  const scale = useSharedValue(1);
  const modeColor = transitColorMap[mode as TransitMode] || colors.walking;
  const badgeSize = layout.transitBadge[size];
  const showCode = code && code.length > 0;

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.95, { damping: 15, stiffness: 300 });
    if (Platform.OS !== "web") {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  }, [scale]);

  const badge = (
    <View
      style={[
        styles.container,
        {
          backgroundColor: modeColor + "26",
          width: showCode ? undefined : badgeSize,
          height: badgeSize,
          borderRadius: radius.lg,
          paddingHorizontal: showCode ? spacing[3] : 0,
          minWidth: badgeSize,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel={`${MODE_LABELS[mode] || mode}${code ? ` ${code}` : ""}`}
    >
      <Text
        style={[
          styles.icon,
          { fontSize: size === "sm" ? 14 : size === "lg" ? 20 : 16 },
        ]}
      >
        {MODE_ICONS[mode] || "🚌"}
      </Text>
      {showCode && (
        <Text
          style={[
            styles.code,
            {
              color: modeColor,
              fontSize: size === "sm" ? fontSize[11] : size === "lg" ? fontSize[15] : fontSize[13],
              fontWeight: size === "lg" ? fontWeight.bold : fontWeight.semiBold,
            },
          ]}
        >
          {code}
        </Text>
      )}
    </View>
  );

  if (!onPress) {
    return badge;
  }

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={animatedStyle}
    >
      {badge}
    </AnimatedPressable>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  icon: {
    textAlign: "center",
  },
  code: {
    fontFamily: "IBM Plex Sans Arabic",
    textAlign: "center",
  },
});

export default TransitBadge;
