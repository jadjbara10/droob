// ============================================================================
// دروب (Droob) — Empty State Component
// Beautiful empty state with SVG-style emoji icon, title, subtitle, and CTA button.
// Used across Routes, SavedRoutes, Alerts, Departures screens.
// ============================================================================

import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { colors, radius, spacing, fontSize, fontWeight, gradients } from "@theme/tokens";

export interface EmptyStateProps {
  icon: string;        // emoji or SVG character
  title: string;       // main heading (Arabic)
  subtitle: string;    // secondary explanation
  ctaText?: string;    // action button label
  onCtaPress?: () => void;
  compact?: boolean;   // smaller variant for embedded use
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon, title, subtitle, ctaText, onCtaPress, compact = false,
}) => (
  <View style={[styles.container, compact && styles.containerCompact]}>
    <View style={styles.iconRing}>
      <Text style={styles.icon}>{icon}</Text>
    </View>
    <Text style={[styles.title, compact && styles.titleCompact]}>{title}</Text>
    <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>{subtitle}</Text>
    {ctaText && onCtaPress && (
      <TouchableOpacity style={styles.cta} onPress={onCtaPress} activeOpacity={0.85}>
        <Text style={styles.ctaText}>{ctaText}</Text>
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[12],
  },
  containerCompact: {
    paddingVertical: spacing[6],
    paddingHorizontal: spacing[4],
  },
  iconRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(26, 79, 138, 0.06)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing[6],
    borderWidth: 2,
    borderColor: "rgba(26, 79, 138, 0.1)",
  },
  icon: {
    fontSize: 44,
  },
  title: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[20],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    textAlign: "center",
    marginBottom: spacing[2],
  },
  titleCompact: {
    fontSize: fontSize[16],
  },
  subtitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    color: colors.text_secondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: spacing[6],
  },
  subtitleCompact: {
    fontSize: fontSize[13],
    marginBottom: spacing[3],
  },
  cta: {
    backgroundColor: colors.brand_blue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing[8],
    paddingVertical: spacing[3],
    shadowColor: colors.brand_blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  ctaText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },
});

export default EmptyState;
