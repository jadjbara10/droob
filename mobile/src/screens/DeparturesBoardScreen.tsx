// ============================================================================
// دروب (Droob) — Departures Board (لوحة المغادرات)
// Inspired by real airport departure boards, but modern
// Live countdown, mode badges, status pills, occupancy
// ============================================================================

import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  Layout,
} from "react-native-reanimated";
import { colors, radius, spacing, fontSize, fontWeight, shadows } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import { TransitBadge } from "@components/TransitBadge";
import { StatusPill } from "@components/StatusPill";
import { CountdownTimer } from "@components/CountdownTimer";

// ─── Types ──────────────────────────────────────────────────────────────────

type OccupancyLevel = "empty" | "partial" | "full";
type DepartureStatus = "on_time" | "delayed" | "cancelled";

interface Departure {
  id: string;
  mode: TransitMode;
  lineCode: string;
  lineNameAr: string;
  destinationAr: string;
  departureTime: string; // ISO string
  status: DepartureStatus;
  scheduledMinutes: number;
  occupancy: OccupancyLevel;
  platform?: string;
  isAccessible: boolean;
  hasAlert: boolean;
}

const MOCK_DEPARTURES: Departure[] = [
  { id: "d1", mode: "brt", lineCode: "BRT1", lineNameAr: "الباص سريع 1", destinationAr: "دوار الداخلية", departureTime: new Date(Date.now() + 4 * 60000).toISOString(), status: "on_time", scheduledMinutes: 4, occupancy: "partial", platform: "A", isAccessible: true, hasAlert: false },
  { id: "d2", mode: "brt", lineCode: "BRT2", lineNameAr: "الباص سريع 2", destinationAr: "المحطة", departureTime: new Date(Date.now() + 7 * 60000).toISOString(), status: "on_time", scheduledMinutes: 7, occupancy: "empty", platform: "B", isAccessible: true, hasAlert: false },
  { id: "d3", mode: "city_bus", lineCode: "12", lineNameAr: "باص المدينة 12", destinationAr: "العبدلي", departureTime: new Date(Date.now() + 3 * 60000).toISOString(), status: "delayed", scheduledMinutes: 3, occupancy: "full", platform: "C", isAccessible: false, hasAlert: true },
  { id: "d4", mode: "serveece", lineCode: "س1", lineNameAr: "سرفيس الصويفية", destinationAr: "دوار الواحة", departureTime: new Date(Date.now() + 1 * 60000).toISOString(), status: "on_time", scheduledMinutes: 1, occupancy: "partial", isAccessible: false, hasAlert: false },
  { id: "d5", mode: "intercity", lineCode: "ش2", lineNameAr: "باص الشمال", destinationAr: "إربد", departureTime: new Date(Date.now() + 15 * 60000).toISOString(), status: "on_time", scheduledMinutes: 15, occupancy: "empty", platform: "D", isAccessible: true, hasAlert: false },
  { id: "d6", mode: "city_bus", lineCode: "28", lineNameAr: "باص المدينة 28", destinationAr: "طبربور", departureTime: new Date(Date.now() + 20 * 60000).toISOString(), status: "cancelled", scheduledMinutes: 20, occupancy: "empty", platform: "A", isAccessible: true, hasAlert: false },
];

// ─── Sub-Components ─────────────────────────────────────────────────────────

const OccupancyDots: React.FC<{ level: OccupancyLevel }> = ({ level }) => {
  const fillMap: Record<OccupancyLevel, number> = { empty: 0, partial: 2, full: 3 };
  const filled = fillMap[level];
  const color = level === "full" ? colors.cancelled : level === "partial" ? colors.delayed : colors.on_time;

  return (
    <View style={styles.occupancyContainer}>
      {[0, 1, 2].map((i) => (
        <View
          key={i}
          style={[
            styles.occupancyDot,
            {
              backgroundColor: i < filled ? color : colors.border,
              opacity: i < filled ? 1 : 0.3,
            },
          ]}
        />
      ))}
    </View>
  );
};

const AlarmBell: React.FC<{ active: boolean; onToggle: () => void }> = ({ active, onToggle }) => {
  const rotation = useSharedValue(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const handlePress = useCallback(() => {
    rotation.value = withSpring(rotation.value === 0 ? -25 : 0, { damping: 10, stiffness: 300 });
    onToggle();
  }, [rotation, onToggle]);

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.7} accessibilityLabel="تنبيه">
      <Animated.Text style={[styles.bellIcon, animatedStyle]}>
        {active ? "🔔" : "🔕"}
      </Animated.Text>
    </TouchableOpacity>
  );
};

// ─── Row Renderer ───────────────────────────────────────────────────────────

const DepartureRow: React.FC<{ item: Departure; index: number }> = ({ item, index }) => {
  const [alertActive, setAlertActive] = useState(item.hasAlert);

  return (
    <Animated.View
      entering={FadeIn.delay(index * 80).duration(400)}
      layout={Layout.springify()}
      style={styles.row}
    >
      {/* Mode badge */}
      <View style={styles.badgeCol}>
        <TransitBadge mode={item.mode} code={item.lineCode} size="md" />
      </View>

      {/* Info */}
      <View style={styles.infoCol}>
        <Text style={styles.destination} numberOfLines={1}>{item.destinationAr}</Text>
        <Text style={styles.lineName} numberOfLines={1}>{item.lineNameAr}</Text>
        {item.platform && (
          <Text style={styles.platform}>رصيف {item.platform}</Text>
        )}
      </View>

      {/* Time + Status */}
      <View style={styles.timeCol}>
        <CountdownTimer
          minutes={item.scheduledMinutes}
          size="lg"
        />
        <StatusPill status={item.status} />
      </View>

      {/* Extras */}
      <View style={styles.extrasCol}>
        <OccupancyDots level={item.occupancy} />
        {item.isAccessible && <Text style={styles.accessibleIcon}>♿</Text>}
        <AlarmBell active={alertActive} onToggle={() => setAlertActive(!alertActive)} />
      </View>
    </Animated.View>
  );
};

// ─── Main Screen ────────────────────────────────────────────────────────────

const DeparturesBoardScreen: React.FC = () => {
  const [departures] = useState<Departure[]>(MOCK_DEPARTURES);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.stopInfo}>
            <Text style={styles.stopName}>محطة الجاردنز</Text>
            <View style={styles.stopCodeBadge}>
              <Text style={styles.stopCodeText}>G01</Text>
            </View>
          </View>
          <View style={styles.liveIndicator}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>مباشر</Text>
          </View>
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.colHeader, styles.colBadge]}>الوسيلة</Text>
        <Text style={[styles.colHeader, styles.colInfo]}>الوجهة</Text>
        <Text style={[styles.colHeader, styles.colTime]}>الوقت</Text>
        <Text style={[styles.colHeader, styles.colExtras]}>الحالة</Text>
      </View>

      {/* Departures List */}
      <FlatList
        data={departures.sort((a, b) => a.scheduledMinutes - b.scheduledMinutes)}
        keyExtractor={(d) => d.id}
        renderItem={({ item, index }) => <DepartureRow item={item} index={index} />}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stopInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  stopName: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[24],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
  },
  stopCodeBadge: {
    backgroundColor: colors.surface_3,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  stopCodeText: {
    fontFamily: "IBM Plex Sans",
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.text_secondary,
    fontVariant: ["tabular-nums"],
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.on_time,
  },
  liveText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.medium,
    color: colors.on_time,
  },

  // Table header
  tableHeader: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: colors.surface_2,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  colHeader: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    fontWeight: fontWeight.semiBold,
    color: colors.text_tertiary,
    textTransform: "uppercase",
  },
  colBadge: { width: 56 },
  colInfo: { flex: 1 },
  colTime: { width: 64, textAlign: "center" },
  colExtras: { width: 72, textAlign: "center" },

  // List
  listContent: {
    paddingBottom: 40,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 72,
  },
  badgeCol: {
    width: 56,
    alignItems: "flex-start",
  },
  infoCol: {
    flex: 1,
    paddingHorizontal: 8,
    gap: 2,
  },
  destination: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[15],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
  },
  lineName: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    color: colors.text_secondary,
  },
  platform: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.text_tertiary,
    marginTop: 1,
  },
  timeCol: {
    width: 64,
    alignItems: "center",
    gap: 4,
  },
  extrasCol: {
    width: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
  },

  // Occupancy
  occupancyContainer: {
    flexDirection: "row",
    gap: 3,
  },
  occupancyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accessibleIcon: {
    fontSize: 14,
    color: colors.text_tertiary,
  },
  bellIcon: {
    fontSize: 16,
  },

  // Separator
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 72, // Inset from left (RTL: from right) for badge
  },
});

export default DeparturesBoardScreen;