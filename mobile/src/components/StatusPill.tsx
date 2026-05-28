// ============================================================================
// دروب (Droob) — StatusPill: في الموعد / تأخير / ملغي
// ============================================================================
import React from "react";
import { View, Text, StyleSheet, type ViewStyle } from "react-native";
import { colors, radius, fontSize, fontWeight } from "@theme/tokens";
import type { DepartureStatus } from "@types/transit";

export interface StatusPillProps { status: DepartureStatus; showDot?: boolean; size?: "sm" | "md"; style?: ViewStyle; }

const CFG: Record<DepartureStatus, { bg: string; t: string; d: string; l: string }> = {
  on_time:   { bg: colors.on_time+"26",   t: colors.on_time,   d: colors.on_time,   l: "في الموعد" },
  delayed:   { bg: colors.delayed+"26",   t: colors.delayed,   d: colors.delayed,   l: "تأخير" },
  cancelled: { bg: colors.cancelled+"26", t: colors.cancelled, d: colors.cancelled, l: "ملغي" },
};

export const StatusPill: React.FC<StatusPillProps> = ({ status, showDot=true, size="md", style }) => {
  const c = CFG[status]; const s = size === "sm";
  return (
    <View style={[st.c, { backgroundColor: c.bg, paddingHorizontal: s?8:10, paddingVertical: s?2:4 }, style]} accessibilityRole="text" accessibilityLabel={c.l}>
      {showDot && <View style={[st.d, { backgroundColor: c.d }]} />}
      <Text style={[st.l, { color: c.t, fontSize: s?fontSize[11]:fontSize[13] }]}>{c.l}</Text>
    </View>
  );
};
const st = StyleSheet.create({
  c: { flexDirection: "row", alignItems: "center", borderRadius: radius.pill, alignSelf: "flex-start", gap: 6 },
  d: { width: 6, height: 6, borderRadius: 3 },
  l: { fontFamily: "IBM Plex Sans Arabic", fontWeight: fontWeight.medium },
});
export default StatusPill;
