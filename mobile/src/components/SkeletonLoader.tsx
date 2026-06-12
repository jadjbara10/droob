// ============================================================================
// دروب (Droob) — Skeleton Loader Component
// Animated shimmer skeleton placeholders matching real component shapes.
// Used during data loading in all screens.
// ============================================================================

import React, { useEffect } from "react";
import { View, StyleSheet, type ViewStyle } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolateColor,
} from "react-native-reanimated";
import { colors, radius, spacing } from "@theme/tokens";

// ─── Shimmer Block ──────────────────────────────────────────────────────────

const ShimmerBlock: React.FC<{
  width: number | string;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
}> = ({ width, height, borderRadius: br = 8, style }) => {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(withTiming(1, { duration: 1200 }), -1, true);
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 0.5, 1],
      ["#E2E8F0", "#F1F5F9", "#E2E8F0"],
    ),
  }));

  return (
    <Animated.View
      style={[
        { width: width as any, height, borderRadius: br },
        animatedStyle,
        style,
      ]}
    />
  );
};

// ─── Card Skeleton ──────────────────────────────────────────────────────────

export const CardSkeleton: React.FC = () => (
  <View style={styles.card}>
    <View style={styles.cardLeft}>
      <ShimmerBlock width={40} height={40} borderRadius={12} />
    </View>
    <View style={styles.cardMid}>
      <ShimmerBlock width="70%" height={16} borderRadius={4} style={{ marginBottom: 8 }} />
      <ShimmerBlock width="50%" height={12} borderRadius={4} />
    </View>
    <View style={styles.cardRight}>
      <ShimmerBlock width={50} height={20} borderRadius={4} style={{ marginBottom: 4 }} />
      <ShimmerBlock width={40} height={12} borderRadius={4} />
    </View>
  </View>
);

// ─── Search Bar Skeleton ────────────────────────────────────────────────────

export const SearchBarSkeleton: React.FC = () => (
  <View style={styles.searchBar}>
    <ShimmerBlock width="100%" height={48} borderRadius={24} />
  </View>
);

// ─── List Skeleton ──────────────────────────────────────────────────────────

export const ListSkeleton: React.FC<{ count?: number }> = ({ count = 4 }) => (
  <View style={styles.list}>
    {Array.from({ length: count }).map((_, i) => (
      <CardSkeleton key={i} />
    ))}
  </View>
);

// ─── Profile Header Skeleton ────────────────────────────────────────────────

export const ProfileHeaderSkeleton: React.FC = () => (
  <View style={styles.profileHeader}>
    <ShimmerBlock width={80} height={80} borderRadius={40} style={{ marginBottom: 12 }} />
    <ShimmerBlock width="50%" height={20} borderRadius={4} style={{ marginBottom: 8 }} />
    <ShimmerBlock width="35%" height={14} borderRadius={4} />
  </View>
);

// ─── Journey Card Skeleton ──────────────────────────────────────────────────

export const JourneyCardSkeleton: React.FC = () => (
  <View style={styles.journeyCard}>
    <View style={{ marginBottom: 12 }}>
      <ShimmerBlock width="40%" height={18} borderRadius={4} style={{ marginBottom: 8 }} />
      <ShimmerBlock width="60%" height={14} borderRadius={4} />
    </View>
    <View style={styles.journeyLine}>
      <ShimmerBlock width={12} height={12} borderRadius={6} />
      <ShimmerBlock width="100%" height={2} borderRadius={1} style={{ flex: 1, marginHorizontal: 8 }} />
      <ShimmerBlock width={12} height={12} borderRadius={6} />
    </View>
    <View style={{ marginTop: 12 }}>
      <ShimmerBlock width="50%" height={14} borderRadius={4} />
    </View>
  </View>
);

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // Card
  card: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[2],
    alignItems: "center",
  },
  cardLeft: {
    marginRight: spacing[3],
  },
  cardMid: {
    flex: 1,
  },
  cardRight: {
    alignItems: "flex-end",
    marginLeft: spacing[2],
  },
  // Search
  searchBar: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  // List
  list: {
    paddingHorizontal: spacing[4],
  },
  // Profile
  profileHeader: {
    alignItems: "center",
    paddingVertical: spacing[8],
  },
  // Journey
  journeyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
  },
  journeyLine: {
    flexDirection: "row",
    alignItems: "center",
  },
});

export default ShimmerBlock;
