// ============================================================================
// دروب (Droob) — HomeScreen (Map-Centric Redesign)
// Uber/Careem-quality transit home: full-screen map, glass search bar,
// bottom sheet with tabs, quick chips, pull-to-refresh, offline banner.
// RTL-optimized, wrapped in ErrorBoundaries, memo-ized throughout.
// ============================================================================

import React, { useCallback, useRef, useMemo, useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Dimensions,
  Platform,
  RefreshControl,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutUp,
} from "react-native-reanimated";
import LeafletMap, { type LeafletMapRef } from "@components/LeafletMap";
import { ErrorBoundary } from "@components/ErrorBoundary";
import {
  colors,
  spacing,
  radius,
  fontSize,
  fontWeight,
  shadows,
  layout,
  glass,
  animation,
} from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { TransitStop, QuickChip, ServiceAlert } from "@/types/transit";
import { BottomSheet, type BottomSheetRef } from "@components/BottomSheet";
import { TransitBadge } from "@components/TransitBadge";
import { CountdownTimer } from "@components/CountdownTimer";

// ─── Constants ────────────────────────────────────────────────────────────────

const { width: SW, height: SH } = Dimensions.get("window");
const SNAP_POINTS = [0.28, 0.55, 0.92];
const AMAAN_COORDS: [number, number] = [35.9106, 31.9539];
const MOCK_USER_LOCATION: [number, number] = [31.955, 35.912];

// ─── Mock Data ─────────────────────────────────────────────────────────────────

const QUICK_CHIPS: QuickChip[] = [
  { id: "1",  icon: "🏠", labelAr: "البيت",      labelEn: "Home",      lat: 31.9539, lng: 35.9106, type: "home" },
  { id: "2",  icon: "💼", labelAr: "العمل",      labelEn: "Work",      lat: 31.978,  lng: 35.895,  type: "work" },
  { id: "3",  icon: "🎓", labelAr: "الجامعة",    labelEn: "University", lat: 31.985,  lng: 35.872,  type: "saved" },
  { id: "4",  icon: "🏛️", labelAr: "وسط البلد",  labelEn: "Downtown",  lat: 31.9516, lng: 35.9335, type: "saved" },
  { id: "5",  icon: "✈️", labelAr: "المطار",     labelEn: "Airport",   lat: 31.7225, lng: 35.9939, type: "saved" },
];

const NEARBY_STOPS: TransitStop[] = [
  { id: "s1", nameAr: "محطة الجاردنز",      nameEn: "Gardens Stn",   code: "G01", lat: 31.975, lng: 35.885, modes: ["brt"],       isLandmark: true,  isAccessible: true,  distance: 120 },
  { id: "s2", nameAr: "دوار الواحة",        nameEn: "Waha Circle",   code: "W12", lat: 31.973, lng: 35.883, modes: ["city_bus", "brt"], isLandmark: false, isAccessible: true,  distance: 250 },
  { id: "s3", nameAr: "موقف سرفيس الصويفية", nameEn: "Sweifieh Srv",  code: "SV3", lat: 31.977, lng: 35.881, modes: ["serveece"],  isLandmark: false, isAccessible: false, distance: 380 },
  { id: "s4", nameAr: "مجمع سفريات الشمال",  nameEn: "North Complex", code: "NB1", lat: 31.985, lng: 35.892, modes: ["intercity"], isLandmark: true,  isAccessible: true,  distance: 500 },
  { id: "s5", nameAr: "المدينة الرياضية",    nameEn: "Sports City",   code: "SC7", lat: 31.989, lng: 35.898, modes: ["city_bus"],  isLandmark: true,  isAccessible: true,  distance: 620 },
  { id: "s6", nameAr: "مشفى التجمّع",       nameEn: "Al Tajammu",    code: "TH3", lat: 31.982, lng: 35.876, modes: ["serveece"],  isLandmark: true,  isAccessible: true,  distance: 740 },
  { id: "s7", nameAr: "شارع عبدون",         nameEn: "Abdoun St",     code: "AB5", lat: 31.969, lng: 35.868, modes: ["city_bus"],  isLandmark: false, isAccessible: false, distance: 890 },
  { id: "s8", nameAr: "دوار الداخلية",       nameEn: "Dakhiliya",    code: "DK2", lat: 31.966, lng: 35.896, modes: ["brt"],       isLandmark: false, isAccessible: true,  distance: 410 },
];

const MODE_COLOR_MAP: Record<string, string> = {
  city_bus: colors.bus_city,
  brt: colors.bus_brt,
  serveece: colors.serveece,
  intercity: colors.intercity,
};

// ─── Tab Type ──────────────────────────────────────────────────────────────────

type SheetTab = "near_me" | "stations";

// ═══════════════════════════════════════════════════════════════════════════════
//  SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Offline Banner ───────────────────────────────────────────────────────────

const OfflineBanner: React.FC<{ visible: boolean }> = React.memo(({ visible }) => {
  if (!visible) return null;
  return (
    <Animated.View entering={SlideInDown.duration(400)} exiting={SlideOutUp.duration(300)} style={styles.offlineBanner}>
      <Text style={styles.offlineIcon}>📡</Text>
      <Text style={styles.offlineText}>تم تحميل بيانات غير مباشرة</Text>
    </Animated.View>
  );
});

OfflineBanner.displayName = "OfflineBanner";

// ─── Glass Search Bar ─────────────────────────────────────────────────────────

interface SearchBarProps {
  onFocus: () => void;
  value?: string;
  onClear?: () => void;
}

const SearchBar: React.FC<SearchBarProps> = React.memo(({ onFocus, value, onClear }) => (
  <Animated.View entering={SlideInDown.duration(400).springify()} style={styles.searchOuter}>
    <View style={styles.searchBar}>
      <TouchableOpacity onPress={onClear} style={styles.searchIconBox} activeOpacity={0.6}>
        <Text style={styles.searchIcon}>{value ? "✕" : "🔍"}</Text>
      </TouchableOpacity>
      <TextInput
        style={styles.searchInput}
        placeholder="إلى أين؟"
        placeholderTextColor={colors.text_tertiary}
        onFocus={onFocus}
        value={value}
        onChangeText={() => {}}
        textAlign="right"
        returnKeyType="search"
        accessibilityLabel="بحث عن وجهة"
        accessibilityHint="اضغط للبحث عن محطة أو وجهة"
      />
      <TouchableOpacity style={styles.searchAvatar} activeOpacity={0.7} accessibilityLabel="الملف الشخصي">
        <Text style={styles.avatarText}>ع</Text>
      </TouchableOpacity>
    </View>
  </Animated.View>
));

SearchBar.displayName = "SearchBar";

// ─── Quick Destination Chips ──────────────────────────────────────────────────

interface QuickChipsRowProps {
  chips: QuickChip[];
  onSelect: (chip: QuickChip) => void;
}

const QuickChipsRow: React.FC<QuickChipsRowProps> = React.memo(({ chips, onSelect }) => (
  <ScrollView
    horizontal
    showsHorizontalScrollIndicator={false}
    contentContainerStyle={styles.chipsRow}
    style={{ flexDirection: "row-reverse" as const }}
  >
    {chips.map((chip) => (
      <TouchableOpacity
        key={chip.id}
        style={styles.chip}
        onPress={() => onSelect(chip)}
        activeOpacity={0.7}
        accessibilityLabel={`${chip.labelAr} — ${chip.labelEn}`}
        accessibilityRole="button"
      >
        <Text style={styles.chipIcon}>{chip.icon}</Text>
        <Text style={styles.chipLabel}>{chip.labelAr}</Text>
      </TouchableOpacity>
    ))}
    <TouchableOpacity
      style={[styles.chip, styles.chipAdd]}
      activeOpacity={0.7}
      accessibilityLabel="إضافة وجهة"
      accessibilityRole="button"
    >
      <Text style={styles.chipAddIcon}>+</Text>
      <Text style={[styles.chipLabel, { color: colors.text_secondary }]}>إضافة</Text>
    </TouchableOpacity>
  </ScrollView>
));

QuickChipsRow.displayName = "QuickChipsRow";

// ─── Stop Card (single nearby station) ────────────────────────────────────────

interface StopCardProps {
  stop: TransitStop;
  onPress: (stop: TransitStop) => void;
}

const StopCard: React.FC<StopCardProps> = React.memo(({ stop, onPress }) => {
  const modeColor = MODE_COLOR_MAP[stop.modes[0]] || colors.bus_city;
  return (
    <TouchableOpacity
      style={styles.stopCard}
      onPress={() => onPress(stop)}
      activeOpacity={0.7}
      accessibilityLabel={`محطة ${stop.nameAr} — على بعد ${stop.distance} متر`}
      accessibilityRole="button"
    >
      <View style={[styles.stopModeBar, { backgroundColor: modeColor }]} />
      <View style={styles.stopCardInner}>
        <Text style={styles.stopName} numberOfLines={2}>
          {stop.nameAr}
        </Text>
        <View style={styles.stopMeta}>
          <Text style={styles.stopDist}>{stop.distance} م</Text>
          <TransitBadge mode={stop.modes[0]} size="sm" />
        </View>
        <CountdownTimer minutes={3 + Math.random() * 8} size="sm" />
      </View>
    </TouchableOpacity>
  );
});

StopCard.displayName = "StopCard";

// ─── Nearby Stops Section ─────────────────────────────────────────────────────

interface NearbyStopsSectionProps {
  stops: TransitStop[];
  onStopPress: (stop: TransitStop) => void;
  title?: string;
}

const NearbyStopsSection: React.FC<NearbyStopsSectionProps> = React.memo(({
  stops,
  onStopPress,
  title = "محطات قريبة",
}) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>{title}</Text>
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.stopsScroll}
      style={{ flexDirection: "row-reverse" as const }}
    >
      {stops.map((s) => (
        <StopCard key={s.id} stop={s} onPress={onStopPress} />
      ))}
    </ScrollView>
  </View>
));

NearbyStopsSection.displayName = "NearbyStopsSection";

// ─── Location FAB (animated) ──────────────────────────────────────────────────

interface LocationFABProps {
  onPress: () => void;
}

const LocationFAB: React.FC<LocationFABProps> = ({ onPress }) => {
  const scale = useSharedValue(1);

  const fabAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Animated.View style={[styles.fabWrap, fabAnimatedStyle]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => { scale.value = withSpring(0.92, animation.spring); }}
        onPressOut={() => { scale.value = withSpring(1, animation.spring); }}
        activeOpacity={0.8}
        accessibilityLabel="موقعي الحالي"
        accessibilityRole="button"
      >
        <View style={styles.fab}>
          <Text style={styles.fabIcon}>📍</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

// ─── Alert Banner ─────────────────────────────────────────────────────────────

interface AlertBannerProps {
  alert: ServiceAlert | null;
  onDismiss: () => void;
}

const AlertBanner: React.FC<AlertBannerProps> = React.memo(({ alert, onDismiss }) => {
  if (!alert) return null;

  const bgColor =
    alert.severity === "critical"
      ? colors.cancelled + "20"
      : alert.severity === "warning"
        ? colors.delayed + "20"
        : colors.brand_blue + "20";
  const borderColor =
    alert.severity === "critical"
      ? colors.cancelled
      : alert.severity === "warning"
        ? colors.delayed
        : colors.brand_blue;

  return (
    <Animated.View
      entering={FadeIn.duration(500)}
      exiting={FadeOut.duration(300)}
      style={[styles.alertBanner, { backgroundColor: bgColor, borderRightColor: borderColor }]}
      accessibilityRole="alert"
      accessibilityLabel={alert.messageAr}
    >
      <View style={styles.alertContent}>
        <Text style={styles.alertEmoji}>
          {alert.severity === "critical" ? "🚨" : "⚠️"}
        </Text>
        <Text style={styles.alertText} numberOfLines={2}>
          {alert.messageAr}
        </Text>
      </View>
      <TouchableOpacity onPress={onDismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Text style={styles.alertX}>✕</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

AlertBanner.displayName = "AlertBanner";

// ─── Sheet Tabs Header ────────────────────────────────────────────────────────

interface TabsHeaderProps {
  activeTab: SheetTab;
  onTabChange: (tab: SheetTab) => void;
}

const TabsHeader: React.FC<TabsHeaderProps> = React.memo(({ activeTab, onTabChange }) => (
  <View style={styles.tabBar}>
    <TouchableOpacity
      style={[styles.tabItem, activeTab === "near_me" && styles.tabItemActive]}
      onPress={() => onTabChange("near_me")}
      activeOpacity={0.7}
      accessibilityLabel="قريب مني"
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === "near_me" }}
    >
      <Text style={[styles.tabIcon]}>📍</Text>
      <Text style={[styles.tabLabel, activeTab === "near_me" && styles.tabLabelActive]}>
        قريب مني
      </Text>
    </TouchableOpacity>

    <View style={styles.tabDivider} />

    <TouchableOpacity
      style={[styles.tabItem, activeTab === "stations" && styles.tabItemActive]}
      onPress={() => onTabChange("stations")}
      activeOpacity={0.7}
      accessibilityLabel="المحطات"
      accessibilityRole="tab"
      accessibilityState={{ selected: activeTab === "stations" }}
    >
      <Text style={styles.tabIcon}>🚌</Text>
      <Text style={[styles.tabLabel, activeTab === "stations" && styles.tabLabelActive]}>
        محطات
      </Text>
    </TouchableOpacity>
  </View>
));

TabsHeader.displayName = "TabsHeader";

// ─── Sheet Content (tabs + chips + stops, wrapped in ScrollView) ─────────────

interface SheetContentProps {
  snapIndex: number;
  activeTab: SheetTab;
  chips: QuickChip[];
  stops: TransitStop[];
  onChip: (chip: QuickChip) => void;
  onStop: (stop: TransitStop) => void;
  onTabChange: (tab: SheetTab) => void;
  onSearchFocus: () => void;
  isRefreshing: boolean;
  onRefresh: () => void;
}

const SheetContent: React.FC<SheetContentProps> = React.memo(({
  snapIndex,
  activeTab,
  chips,
  stops,
  onChip,
  onStop,
  onTabChange,
  onSearchFocus,
  isRefreshing,
  onRefresh,
}) => {
  // When fully expanded, show the full search screen instead
  if (snapIndex === 2) {
    return (
      <View style={styles.sheetPad}>
        <TouchableOpacity style={styles.searchFieldLarge} onPress={onSearchFocus} activeOpacity={0.7}>
          <Text style={styles.searchFieldPlaceholder}>ابحث عن محطة أو خط...</Text>
        </TouchableOpacity>
        <Text style={styles.emptyHint}>جاري تجربة البحث المتقدم</Text>
      </View>
    );
  }

  const compact = snapIndex === 0;
  const displayStops = compact ? stops.slice(0, 3) : stops;

  return (
    <ScrollView
      style={styles.sheetScroll}
      contentContainerStyle={styles.sheetScrollContent}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={onRefresh}
          tintColor={colors.brand_blue}
          colors={[colors.brand_blue, colors.brand_green]}
          progressBackgroundColor={colors.surface}
        />
      }
      nestedScrollEnabled={Platform.OS === "android"}
    >
      <TabsHeader activeTab={activeTab} onTabChange={onTabChange} />

      {activeTab === "near_me" ? (
        <>
          <QuickChipsRow chips={chips} onSelect={onChip} />
          <NearbyStopsSection stops={displayStops} onStopPress={onStop} />
          {!compact && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>الرحلات الأخيرة</Text>
                <Text style={styles.emptyHint}>لا توجد رحلات سابقة</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>مقترحات</Text>
                <Text style={styles.emptyHint}>اختر وجهة لبدء التخطيط</Text>
              </View>
            </>
          )}
        </>
      ) : (
        <>
          <QuickChipsRow chips={chips} onSelect={onChip} />
          <NearbyStopsSection stops={displayStops} onStopPress={onStop} />
          {!compact && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>جميع المحطات</Text>
              <View style={styles.allStopsList}>
                {stops.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={styles.allStopRow}
                    onPress={() => onStop(s)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.allStopDot,
                        { backgroundColor: MODE_COLOR_MAP[s.modes[0]] || colors.bus_city },
                      ]}
                    />
                    <View style={styles.allStopInfo}>
                      <Text style={styles.allStopName}>{s.nameAr}</Text>
                      <Text style={styles.allStopNameEn}>{s.nameEn}</Text>
                    </View>
                    <View style={styles.allStopRight}>
                      <Text style={styles.allStopDist}>{s.distance} م</Text>
                      <TransitBadge mode={s.modes[0]} size="sm" />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
});

SheetContent.displayName = "SheetContent";

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bsRef = useRef<BottomSheetRef>(null);
  const mapRef = useRef<LeafletMapRef>(null);

  const [snapIdx, setSnapIdx] = useState(0);
  const [alert, setAlert] = useState<ServiceAlert | null>(null);
  const [isOffline, setIsOffline] = useState(true); // mock = offline
  const [activeTab, setActiveTab] = useState<SheetTab>("near_me");
  const [isRefreshing, setIsRefreshing] = useState(false);
  // ── Simulate offline data load ─────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsOffline(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // ── Map fly-to helper ──────────────────────────────────────────────────
  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    mapRef.current?.flyTo(lng, lat, zoom);
  }, []);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleSearchFocus = useCallback(() => {
    bsRef.current?.snapTo(2);
  }, []);

  const handleChip = useCallback(
    (chip: QuickChip) => {
      flyTo(chip.lng, chip.lat, 15);
    },
    [flyTo],
  );

  const handleStop = useCallback(
    (stop: TransitStop) => {
      flyTo(stop.lng, stop.lat, 16);
      bsRef.current?.snapTo(1);
    },
    [flyTo],
  );

  const handleLocation = useCallback(() => {
    flyTo(AMAAN_COORDS[0], AMAAN_COORDS[1], 13);
  }, [flyTo]);

  const handleTabChange = useCallback((tab: SheetTab) => {
    setActiveTab(tab);
  }, []);

  const handleRefresh = useCallback(() => {
    setIsRefreshing(true);
    // Simulate data refresh
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  }, []);

  const handleDismissAlert = useCallback(() => {
    setAlert(null);
  }, []);

  // ── Memo-ized snap change ──────────────────────────────────────────────
  const handleSnapChange = useCallback((index: number) => {
    setSnapIdx(index);
  }, []);

  // ── Map markers from stops + user location ─────────────────────────────
  const mapMarkers = useMemo(() => {
    const markers = NEARBY_STOPS.map((s) => ({
      id: s.id,
      lat: s.lat,
      lng: s.lng,
      label: s.nameAr,
      color: MODE_COLOR_MAP[s.modes[0]] || colors.bus_city,
    }));
    // Add a simulated user-location marker (different styling via LeafletMap circleMarker color)
    markers.push({
      id: "user-loc",
      lat: MOCK_USER_LOCATION[1],
      lng: MOCK_USER_LOCATION[0],
      label: "موقعي",
      color: colors.brand_blue,
    });
    return markers;
  }, []);

  // ── Sheet content (rebuilt only when its dependencies change) ───────────
  const renderSheet = useCallback(() => {
    return (
      <SheetContent
        snapIndex={snapIdx}
        activeTab={activeTab}
        chips={QUICK_CHIPS}
        stops={NEARBY_STOPS}
        onChip={handleChip}
        onStop={handleStop}
        onTabChange={handleTabChange}
        onSearchFocus={handleSearchFocus}
        isRefreshing={isRefreshing}
        onRefresh={handleRefresh}
      />
    );
  }, [snapIdx, activeTab, handleChip, handleStop, handleTabChange, handleSearchFocus, isRefreshing, handleRefresh]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.root}>
      {/* ── FULL-SCREEN MAP ── */}
      <ErrorBoundary
        fallback={
          <View style={[styles.map, styles.mapFallback]}>
            <Text style={styles.mapFallbackIcon}>🗺️</Text>
            <Text style={styles.mapFallbackTitle}>تعذر تحميل الخريطة</Text>
            <Text style={styles.mapFallbackHint}>تحقق من اتصالك بالإنترنت</Text>
          </View>
        }
      >
        <LeafletMap
          ref={mapRef}
          style={styles.map}
          centerLat={AMAAN_COORDS[1]}
          centerLng={AMAAN_COORDS[0]}
          zoom={13}
          markers={mapMarkers}
        />
      </ErrorBoundary>

      {/* ── SEARCH BAR (absolute top) ── */}
      <ErrorBoundary fallback={null}>
        <View style={[styles.searchContainer, { top: insets.top + spacing[2] }]}>
          <SearchBar onFocus={handleSearchFocus} />
        </View>
      </ErrorBoundary>

      {/* ── OFFLINE BANNER (below search bar) ── */}
      <ErrorBoundary fallback={null}>
        <View style={[styles.offlineContainer, { top: insets.top + layout.searchBarHeight + spacing[5] }]}>
          <OfflineBanner visible={isOffline} />
        </View>
      </ErrorBoundary>

      {/* ── ALERT BANNER ── */}
      <ErrorBoundary fallback={null}>
        <View style={[styles.alertContainer, { top: insets.top + layout.searchBarHeight + spacing[8] }]}>
          <AlertBanner alert={alert} onDismiss={handleDismissAlert} />
        </View>
      </ErrorBoundary>

      {/* ── LOCATION FAB ── */}
      <View style={[styles.fabPosition, { bottom: SH * 0.30 }]}>
        <LocationFAB onPress={handleLocation} />
      </View>

      {/* ── BOTTOM SHEET ── */}
      <ErrorBoundary
        fallback={
          <View style={styles.sheetFallback}>
            <Text style={styles.sheetFallbackText}>🚌 اسحب للأعلى لاستعراض المحطات</Text>
          </View>
        }
      >
        <BottomSheet
          ref={bsRef}
          snapPoints={SNAP_POINTS}
          initialIndex={0}
          onSnapChange={handleSnapChange}
          enableBackdropDismiss
        >
          {renderSheet()}
        </BottomSheet>
      </ErrorBoundary>
    </View>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
//  STYLES — all values from @theme/tokens
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // ── Root & Map ─────────────────────────────────────────────────────────
  root: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  mapFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.surface_2,
    alignItems: "center",
    justifyContent: "center",
  },
  mapFallbackIcon: {
    fontSize: 48,
    marginBottom: spacing[4],
  },
  mapFallbackTitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[18],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    marginBottom: spacing[2],
  },
  mapFallbackHint: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    color: colors.text_tertiary,
  },

  // ── Search Bar ─────────────────────────────────────────────────────────
  searchContainer: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    zIndex: 10,
  },
  searchOuter: {
    width: "100%",
  },
  searchBar: {
    height: layout.searchBarHeight,
    borderRadius: layout.searchBarHeight / 2,
    backgroundColor: Platform.OS === "ios" ? glass.ios.backgroundColor : glass.android.backgroundColor,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing[2],
    ...shadows.md,
  },
  searchIconBox: {
    width: layout.avatarSize,
    height: layout.avatarSize,
    alignItems: "center",
    justifyContent: "center",
  },
  searchIcon: {
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[16],
    color: colors.text_primary,
    paddingHorizontal: spacing[2],
    writingDirection: "rtl",
  },
  searchAvatar: {
    width: layout.avatarSize,
    height: layout.avatarSize,
    borderRadius: layout.avatarSize / 2,
    backgroundColor: colors.brand_blue,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.bold,
    color: colors.white,
  },

  // ── Offline Banner ─────────────────────────────────────────────────────
  offlineContainer: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    zIndex: 9,
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[4],
    borderRadius: radius.pill,
    backgroundColor: colors.delayed + "20",
    borderWidth: 1,
    borderColor: colors.delayed + "40",
    gap: spacing[2],
  },
  offlineIcon: {
    fontSize: 14,
  },
  offlineText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.medium,
    color: colors.text_primary,
  },

  // ── Alert Banner ───────────────────────────────────────────────────────
  alertContainer: {
    position: "absolute",
    left: spacing[4],
    right: spacing[4],
    zIndex: 9,
  },
  alertBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: spacing[3],
    borderRadius: radius.card,
    borderRightWidth: 3,
  },
  alertContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  alertEmoji: {
    fontSize: 18,
  },
  alertText: {
    flex: 1,
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    color: colors.text_primary,
  },
  alertX: {
    fontSize: 16,
    color: colors.text_secondary,
    padding: spacing[1],
  },

  // ── FAB ───────────────────────────────────────────────────────────────
  fabPosition: {
    position: "absolute",
    right: spacing[4],
    zIndex: 10,
  },
  fabWrap: {},
  fab: {
    width: layout.fabSize,
    height: layout.fabSize,
    borderRadius: layout.fabSize / 2,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fabIcon: {
    fontSize: 24,
  },

  // ── Sheet ──────────────────────────────────────────────────────────────
  sheetPad: {
    flex: 1,
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
  },
  sheetScroll: {
    flex: 1,
  },
  sheetScrollContent: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[1],
    paddingBottom: spacing[8],
  },
  sheetFallback: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.bottomSheet,
    borderTopRightRadius: radius.bottomSheet,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.md,
  },
  sheetFallbackText: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    color: colors.text_secondary,
  },

  // ── Tabs ───────────────────────────────────────────────────────────────
  tabBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface_3,
    borderRadius: radius.pill,
    padding: spacing[1],
    marginBottom: spacing[3],
    marginTop: spacing[2],
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing[2],
    paddingHorizontal: spacing[3],
    borderRadius: radius.pill,
    gap: spacing[1],
  },
  tabItemActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabIcon: {
    fontSize: 15,
  },
  tabLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.medium,
    color: colors.text_secondary,
  },
  tabLabelActive: {
    color: colors.text_primary,
    fontWeight: fontWeight.semiBold,
  },
  tabDivider: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing[1],
  },

  // ── Chips ──────────────────────────────────────────────────────────────
  chipsRow: {
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    height: layout.chipHeight,
    paddingHorizontal: spacing[4],
    borderRadius: radius.pill,
    backgroundColor: colors.surface_2,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[2],
  },
  chipAdd: {
    borderStyle: "dashed",
  },
  chipIcon: {
    fontSize: 15,
  },
  chipAddIcon: {
    fontSize: 16,
    color: colors.text_secondary,
    fontWeight: fontWeight.bold,
  },
  chipLabel: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.medium,
    color: colors.text_primary,
  },

  // ── Section ────────────────────────────────────────────────────────────
  section: {
    marginTop: spacing[4],
  },
  sectionTitle: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[18],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    marginBottom: spacing[3],
  },
  stopsScroll: {
    gap: spacing[3],
    paddingBottom: spacing[1],
  },
  emptyHint: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    color: colors.text_tertiary,
    textAlign: "center",
    paddingVertical: spacing[5],
  },

  // ── Stop Card ──────────────────────────────────────────────────────────
  stopCard: {
    width: layout.stopCardWidth,
    height: layout.stopCardHeight,
    borderRadius: radius.card,
    backgroundColor: colors.surface,
    overflow: "hidden",
    ...shadows.sm,
  },
  stopModeBar: {
    height: 4,
    width: "100%",
  },
  stopCardInner: {
    flex: 1,
    padding: spacing[2],
    justifyContent: "space-between",
  },
  stopName: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    fontWeight: fontWeight.bold,
    color: colors.text_primary,
    textAlign: "right",
    lineHeight: 18,
  },
  stopMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  stopDist: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[11],
    color: colors.text_tertiary,
  },

  // ── All Stops List (stations tab, expanded) ────────────────────────────
  allStopsList: {
    gap: spacing[2],
  },
  allStopRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing[3],
  },
  allStopDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  allStopInfo: {
    flex: 1,
  },
  allStopName: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[14],
    fontWeight: fontWeight.semiBold,
    color: colors.text_primary,
  },
  allStopNameEn: {
    fontFamily: "IBM Plex Sans",
    fontSize: fontSize[11],
    color: colors.text_tertiary,
    marginTop: 2,
  },
  allStopRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing[2],
  },
  allStopDist: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[13],
    color: colors.text_secondary,
  },

  // ── Search Large (fully expanded sheet) ────────────────────────────────
  searchFieldLarge: {
    height: 52,
    borderRadius: radius.card,
    backgroundColor: colors.surface_2,
    justifyContent: "center",
    paddingHorizontal: spacing[4],
    marginTop: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchFieldPlaceholder: {
    fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[16],
    color: colors.text_tertiary,
  },
});

export default HomeScreen;
