// ============================================================================
// دروب (Droob) — BottomSheet Component
// Snap points via Reanimated v3 + Gesture Handler
// Spring animation: damping=20, stiffness=200
// Backdrop: dimmed overlay, tap to dismiss
// Drag handle: 4×32px pill
// ============================================================================

import React, { useCallback, useImperativeHandle, forwardRef, useState } from "react";
import { View, StyleSheet, Dimensions, Pressable, type ViewStyle } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  runOnJS,
  withTiming,
} from "react-native-reanimated";
import { colors, radius, shadows } from "@theme/tokens";

// ─── Constants ──────────────────────────────────────────────────────────────

const { height: WINDOW_HEIGHT, width: WINDOW_WIDTH } = Dimensions.get("window");
// Fallback to a reasonable height if Dimensions returns 0 (edge case on some Android devices)
const SCREEN_HEIGHT = WINDOW_HEIGHT > 0 ? WINDOW_HEIGHT : 800;
const SPRING = { damping: 20, stiffness: 200, mass: 0.8 };
const HANDLE_HEIGHT = 20;
const HANDLE_BAR_HEIGHT = 4;
const HANDLE_BAR_WIDTH = 32;

// ─── Props ──────────────────────────────────────────────────────────────────

export interface BottomSheetProps {
  snapPoints: number[];
  initialIndex?: number;
  onSnapChange?: (index: number) => void;
  showHandle?: boolean;
  showBackdrop?: boolean;
  enableBackdropDismiss?: boolean;
  children: React.ReactNode;
  style?: ViewStyle;
}

export interface BottomSheetRef {
  snapTo: (index: number) => void;
  getCurrentIndex: () => number;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const BottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  (
    {
      snapPoints,
      initialIndex = 0,
      onSnapChange,
      showHandle = true,
      showBackdrop = true,
      enableBackdropDismiss = true,
      children,
      style,
    },
    ref
  ) => {
    const snapPixelPositions = snapPoints
      .map((p) => SCREEN_HEIGHT * (1 - p))
      .sort((a, b) => a - b);

    const translateY = useSharedValue(snapPixelPositions[initialIndex]);
    const contextY = useSharedValue(snapPixelPositions[initialIndex]);
    const activeIndex = useSharedValue(initialIndex);
    const [isDragging, setIsDragging] = useState(false);

    const snapTo = useCallback(
      (index: number) => {
        "worklet";
        const clamped = Math.max(0, Math.min(index, snapPixelPositions.length - 1));
        translateY.value = withSpring(snapPixelPositions[clamped], SPRING);
        activeIndex.value = clamped;
      },
      [snapPixelPositions.length]
    );

    useImperativeHandle(ref, () => ({
      snapTo: (index: number) => snapTo(index),
      getCurrentIndex: () => activeIndex.value,
    }));

    const panGesture = Gesture.Pan()
      .onStart(() => {
        contextY.value = translateY.value;
        runOnJS(setIsDragging)(true);
      })
      .onUpdate((event) => {
        const newVal = contextY.value + event.translationY;
        translateY.value = Math.max(
          snapPixelPositions[snapPixelPositions.length - 1] - 100,
          Math.min(SCREEN_HEIGHT - 60, newVal)
        );
      })
      .onEnd((event) => {
        runOnJS(setIsDragging)(false);
        const velocity = event.velocityY;
        const currentY = translateY.value;

        let targetIndex = activeIndex.value;
        if (Math.abs(velocity) > 300) {
          if (velocity > 0) {
            targetIndex = Math.min(snapPixelPositions.length - 1, activeIndex.value + 1);
          } else {
            targetIndex = Math.max(0, activeIndex.value - 1);
          }
        } else {
          let minDist = Infinity;
          for (let i = 0; i < snapPixelPositions.length; i++) {
            const dist = Math.abs(currentY - snapPixelPositions[i]);
            if (dist < minDist) {
              minDist = dist;
              targetIndex = i;
            }
          }
        }

        translateY.value = withSpring(snapPixelPositions[targetIndex], SPRING);
        activeIndex.value = targetIndex;

        if (onSnapChange) {
          runOnJS(onSnapChange)(targetIndex);
        }
      });

    const sheetStyle = useAnimatedStyle(() => ({
      transform: [{ translateY: translateY.value }],
    }));

    const backdropStyle = useAnimatedStyle(() => {
      const lastSnap = snapPixelPositions[snapPixelPositions.length - 1];
      const firstSnap = snapPixelPositions[0];
      return {
        opacity: interpolate(translateY.value, [firstSnap, lastSnap], [0.5, 0]),
        pointerEvents:
          translateY.value > firstSnap + 20 ? ("none" as const) : ("auto" as const),
      };
    });

    const handleBackdropPress = useCallback(() => {
      if (enableBackdropDismiss) {
        snapTo(snapPixelPositions.length - 1);
      }
    }, [enableBackdropDismiss, snapTo]);

    return (
      <View style={styles.wrapper} pointerEvents="box-none">
        {showBackdrop && (
          <Animated.View style={[styles.backdrop, backdropStyle]}>
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleBackdropPress}
            />
          </Animated.View>
        )}

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.sheet,
              {
                height: SCREEN_HEIGHT,
                top: 0,
                borderTopLeftRadius: radius.bottomSheet,
                borderTopRightRadius: radius.bottomSheet,
              },
              sheetStyle,
              style,
            ]}
          >
            {showHandle && (
              <View style={styles.handleArea}>
                <View style={styles.handleBar} />
              </View>
            )}

            <View style={styles.content}>{children}</View>
          </Animated.View>
        </GestureDetector>
      </View>
    );
  }
);

BottomSheet.displayName = "BottomSheet";

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    ...shadows.xl,
  },
  handleArea: {
    height: HANDLE_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  handleBar: {
    width: HANDLE_BAR_WIDTH,
    height: HANDLE_BAR_HEIGHT,
    backgroundColor: colors.border,
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
});

export default BottomSheet;
