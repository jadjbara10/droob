// ============================================================================
// دروب (Droob) — AdBanner (WebView-based)
// Shows AdMob-like ads via WebView — no native module needed
// Swappable with react-native-google-mobile-ads when build issues resolved
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, radius, spacing, fontSize, fontWeight } from "@theme/tokens";

type Props = {
  adUnitId?: string;
};

export default function AdBanner({ adUnitId: _adUnitId }: Props) {
  // Placeholder — will be replaced with real AdMob WebView or native ads
  return (
    <TouchableOpacity style={styles.container} activeOpacity={0.8}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>Ad</Text>
      </View>
      <Text style={styles.text}>اعلان</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 55,
    backgroundColor: colors.surface_2,
    marginHorizontal: spacing[3],
    marginVertical: spacing[1],
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  badge: {
    position: "absolute",
    top: 4,
    right: 8,
    backgroundColor: colors.gold_accent + "30",
    paddingHorizontal: spacing[2],
    borderRadius: radius.input,
  },
  badgeText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.gold_accent,
    fontWeight: fontWeight.bold,
  },
  text: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    color: colors.text_tertiary,
  },
});
