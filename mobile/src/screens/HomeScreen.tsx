// ============================================================================
// دروب (Droob) — HomeScreen (Map View)
// Full-screen Mapbox map + floating search + bottom sheet + FAB
// RTL-optimized, glassmorphism, native-driver animations
// ============================================================================

import React, { useCallback, useRef, useMemo, useState } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  Dimensions, Platform, FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import MapboxGL from "@rnmapbox/maps";
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring,
  FadeIn, SlideInDown,
} from "react-native-reanimated";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";
import type { TransitMode } from "@theme/tokens";
import type { TransitStop, QuickChip, ServiceAlert } from "@types/transit";
import { BottomSheet, type BottomSheetRef } from "@components/BottomSheet";
import { TransitBadge } from "@components/TransitBadge";
import { CountdownTimer } from "@components/CountdownTimer";

const { width: SW, height: SH } = Dimensions.get("window");
const SNAP_POINTS = [0.28, 0.55, 0.92];
const AMAAN_COORDS: [number, number] = [35.9106, 31.9539];

// ─── Mock Data ──────────────────────────────────────────────────────────────

const QUICK_CHIPS: QuickChip[] = [
  { id:"1", icon:"🏠", labelAr:"البيت", labelEn:"Home", lat:31.9539, lng:35.9106, type:"home" },
  { id:"2", icon:"🎓", labelAr:"الجامعة", labelEn:"University", lat:31.985, lng:35.872, type:"saved" },
  { id:"3", icon:"🏙️", labelAr:"البلد", labelEn:"Downtown", lat:31.9516, lng:35.9335, type:"saved" },
  { id:"4", icon:"✈️", labelAr:"المطار", labelEn:"Airport", lat:31.7225, lng:35.9939, type:"saved" },
];

const NEARBY_STOPS: TransitStop[] = [
  { id:"s1", nameAr:"محطة الجاردنز", nameEn:"Gardens Stn", code:"G01", lat:31.975, lng:35.885, modes:["brt"], isLandmark:true, isAccessible:true, distance:120 },
  { id:"s2", nameAr:"دوار الواحة", nameEn:"Waha Circle", code:"W12", lat:31.973, lng:35.883, modes:["city_bus","brt"], isLandmark:false, isAccessible:true, distance:250 },
  { id:"s3", nameAr:"موقف سرفيس الصويفية", nameEn:"Sweifieh Serveece", code:"SV3", lat:31.977, lng:35.881, modes:["serveece"], isLandmark:false, isAccessible:false, distance:380 },
  { id:"s4", nameAr:"مجمع سفريات الشمال", nameEn:"North Complex", code:"NB1", lat:31.985, lng:35.892, modes:["intercity"], isLandmark:true, isAccessible:true, distance:500 },
  { id:"s5", nameAr:"محطة المدينة الرياضية", nameEn:"Sports City", code:"SC7", lat:31.989, lng:35.898, modes:["city_bus"], isLandmark:true, isAccessible:true, distance:620 },
];

const MODE_COLOR_MAP: Record<string, string> = {
  city_bus: colors.bus_city, brt: colors.bus_brt, serveece: colors.serveece, intercity: colors.intercity,
};

// ─── Sub-Components ─────────────────────────────────────────────────────────

/** Floating search bar with glass effect */
const SearchBar: React.FC<{ onFocus: () => void }> = ({ onFocus }) => (
  <Animated.View entering={SlideInDown.duration(400)} style={styles.searchOuter}>
    <View style={styles.searchBar}>
      <View style={styles.searchIconBox}><Text style={styles.searchIcon}>🔍</Text></View>
      <TextInput
        style={styles.searchInput}
        placeholder="إلى أين؟"
        placeholderTextColor={colors.text_tertiary}
        onFocus={onFocus}
        textAlign="right"
        returnKeyType="search"
      />
      <View style={styles.searchRight}>
        <View style={styles.avatar}><Text style={styles.avatarText}>ع</Text></View>
      </View>
    </View>
  </Animated.View>
);

/** Quick destination chips row */
const QuickChipsRow: React.FC<{ chips: QuickChip[]; onSelect: (c: QuickChip) => void }> = React.memo(({ chips, onSelect }) => (
  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRow} style={{ flexDirection:"row-reverse" }}>
    {chips.map((c) => (
      <TouchableOpacity key={c.id} style={styles.chip} onPress={() => onSelect(c)} activeOpacity={0.7}>
        <Text style={styles.chipIcon}>{c.icon}</Text>
        <Text style={styles.chipLabel}>{c.labelAr}</Text>
      </TouchableOpacity>
    ))}
    <TouchableOpacity style={[styles.chip, styles.chipAdd]}>
      <Text style={styles.chipAddIcon}>+</Text>
      <Text style={[styles.chipLabel, { color: colors.text_secondary }]}>إضافة</Text>
    </TouchableOpacity>
  </ScrollView>
));

/** Individual stop card — horizontal scroll item */
const StopCard: React.FC<{ stop: TransitStop; onPress: (s: TransitStop) => void }> = React.memo(({ stop, onPress }) => {
  const modeColor = MODE_COLOR_MAP[stop.modes[0]] || colors.bus_city;
  return (
    <TouchableOpacity style={styles.stopCard} onPress={() => onPress(stop)} activeOpacity={0.7}>
      <View style={[styles.stopModeBar, { backgroundColor: modeColor }]} />
      <View style={styles.stopCardInner}>
        <Text style={styles.stopName} numberOfLines={2}>{stop.nameAr}</Text>
        <View style={styles.stopMeta}>
          <Text style={styles.stopDist}>{stop.distance} م</Text>
          <TransitBadge mode={stop.modes[0]} size="sm" />
        </View>
        <CountdownTimer minutes={3 + Math.random() * 8} size="sm" />
      </View>
    </TouchableOpacity>
  );
});

/** Nearby stops section */
const NearbyStops: React.FC<{ stops: TransitStop[]; onStopPress: (s: TransitStop) => void }> = React.memo(({ stops, onStopPress }) => (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>محطات قريبة</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stopsScroll} style={{ flexDirection:"row-reverse" }}>
      {stops.map((s) => <StopCard key={s.id} stop={s} onPress={onStopPress} />)}
    </ScrollView>
  </View>
));

/** Location FAB */
const LocationFAB: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const fabStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Animated.View style={[styles.fabWrap, fabStyle]}>
      <TouchableOpacity onPress={onPress} onPressIn={() => { scale.value = withSpring(0.92); }} onPressOut={() => { scale.value = withSpring(1); }} activeOpacity={0.8} accessibilityLabel="موقعي">
        <View style={styles.fab}><Text style={styles.fabIcon}>📍</Text></View>
      </TouchableOpacity>
    </Animated.View>
  );
};

/** Alert banner — slides in from top */
const AlertBanner: React.FC<{ alert: ServiceAlert | null; onDismiss: () => void }> = ({ alert, onDismiss }) => {
  if (!alert) return null;
  const bg = alert.severity === "critical" ? colors.cancelled+"20" : alert.severity === "warning" ? colors.delayed+"20" : colors.brand_blue+"20";
  const bc = alert.severity === "critical" ? colors.cancelled : alert.severity === "warning" ? colors.delayed : colors.brand_blue;
  return (
    <Animated.View entering={FadeIn.duration(500)} style={[styles.alert, { backgroundColor:bg, borderRightColor:bc }]}>
      <View style={styles.alertContent}>
        <Text style={styles.alertEmoji}>{alert.severity==="critical"?"🚨":"⚠️"}</Text>
        <Text style={styles.alertText} numberOfLines={2}>{alert.messageAr}</Text>
      </View>
      <TouchableOpacity onPress={onDismiss}><Text style={styles.alertX}>✕</Text></TouchableOpacity>
    </Animated.View>
  );
};

// ─── Sheet Content Sections ─────────────────────────────────────────────────

const SheetContent28: React.FC<{
  chips: QuickChip[]; stops: TransitStop[];
  onChip: (c: QuickChip) => void; onStop: (s: TransitStop) => void;
}> = React.memo(({ chips, stops, onChip, onStop }) => (
  <View style={styles.sheetPad}>
    <QuickChipsRow chips={chips} onSelect={onChip} />
    <NearbyStops stops={stops} onStopPress={onStop} />
  </View>
));

const SheetContent55: React.FC<{
  chips: QuickChip[]; stops: TransitStop[];
  onChip: (c: QuickChip) => void; onStop: (s: TransitStop) => void;
}> = React.memo(({ chips, stops, onChip, onStop }) => (
  <View style={styles.sheetPad}>
    <QuickChipsRow chips={chips} onSelect={onChip} />
    <NearbyStops stops={stops} onStopPress={onStop} />
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>الرحلات الأخيرة</Text>
      <Text style={styles.emptyHint}>لا توجد رحلات سابقة</Text>
    </View>
  </View>
));

const SheetContent92: React.FC<{ onFocus: () => void }> = React.memo(({ onFocus }) => (
  <View style={styles.sheetPad}>
    <Text style={styles.sectionTitle}>بحث</Text>
    <TouchableOpacity style={styles.searchFieldLarge} onPress={onFocus}>
      <Text style={styles.searchFieldPlaceholder}>ابحث عن محطة أو خط...</Text>
    </TouchableOpacity>
  </View>
));

// ─── MAIN SCREEN ────────────────────────────────────────────────────────────

const HomeScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const bsRef = useRef<BottomSheetRef>(null);
  const camRef = useRef<MapboxGL.Camera>(null);
  const [snapIdx, setSnapIdx] = useState(0);
  const [alert, setAlert] = useState<ServiceAlert | null>(null);

  const flyTo = useCallback((lng: number, lat: number, zoom = 14) => {
    camRef.current?.flyTo([lng, lat], 800);
    camRef.current?.zoomTo(zoom, 400);
  }, []);

  const handleSearchFocus = useCallback(() => { bsRef.current?.snapTo(2); }, []);
  const handleChip = useCallback((c: QuickChip) => { flyTo(c.lng, c.lat, 15); }, [flyTo]);
  const handleStop = useCallback((s: TransitStop) => { flyTo(s.lng, s.lat, 16); bsRef.current?.snapTo(1); }, [flyTo]);
  const handleLocation = useCallback(() => { flyTo(AMAAN_COORDS[0], AMAAN_COORDS[1], 13); }, [flyTo]);

  const renderSheet = useCallback(() => {
    switch (snapIdx) {
      case 0: return <SheetContent28 chips={QUICK_CHIPS} stops={NEARBY_STOPS} onChip={handleChip} onStop={handleStop} />;
      case 1: return <SheetContent55 chips={QUICK_CHIPS} stops={NEARBY_STOPS} onChip={handleChip} onStop={handleStop} />;
      default: return <SheetContent92 onFocus={handleSearchFocus} />;
    }
  }, [snapIdx, handleChip, handleStop, handleSearchFocus]);

  return (
    <View style={styles.root}>
      {/* MAP — full screen */}
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        scaleBarEnabled={false} logoEnabled={false} attributionEnabled={false} compassEnabled={false}
      >
        <MapboxGL.Camera ref={camRef} centerCoordinate={AMAAN_COORDS} zoomLevel={13} animationDuration={0} />
      </MapboxGL.MapView>

      {/* SEARCH BAR */}
      <View style={[styles.searchContainer, { top: insets.top + 8 }]}>
        <SearchBar onFocus={handleSearchFocus} />
      </View>

      {/* ALERT */}
      <View style={[styles.alertContainer, { top: insets.top + 72 }]}>
        <AlertBanner alert={alert} onDismiss={() => setAlert(null)} />
      </View>

      {/* FAB */}
      <View style={[styles.fabPosition, { bottom: SH * 0.30 }]}>
        <LocationFAB onPress={handleLocation} />
      </View>

      {/* BOTTOM SHEET */}
      <BottomSheet ref={bsRef} snapPoints={SNAP_POINTS} initialIndex={0} onSnapChange={setSnapIdx} enableBackdropDismiss>
        {renderSheet()}
      </BottomSheet>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  map: { ...StyleSheet.absoluteFillObject },

  // Search
  searchContainer: { position:"absolute", left:16, right:16, zIndex:10 },
  searchOuter: { width:"100%" },
  searchBar: {
    height: layout.searchBarHeight, borderRadius: layout.searchBarHeight/2,
    backgroundColor: Platform.OS==="ios" ? "rgba(255,255,255,0.85)" : colors.surface,
    flexDirection:"row", alignItems:"center", paddingHorizontal:8, ...shadows.md,
  },
  searchIconBox: { width:40, height:40, alignItems:"center", justifyContent:"center" },
  searchIcon: { fontSize:18 },
  searchInput: { flex:1, fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[16], color:colors.text_primary, paddingHorizontal:8, writingDirection:"rtl" },
  searchRight: { flexDirection:"row", alignItems:"center", gap:8, paddingRight:4 },
  avatar: { width:32, height:32, borderRadius:16, backgroundColor:colors.brand_blue, alignItems:"center", justifyContent:"center" },
  avatarText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], fontWeight:fontWeight.bold, color:"#fff" },

  // Alert
  alertContainer: { position:"absolute", left:16, right:16, zIndex:10 },
  alert: { flexDirection:"row", alignItems:"center", padding:12, borderRadius:radius.card, borderRightWidth:3 },
  alertContent: { flex:1, flexDirection:"row", alignItems:"center", gap:8 },
  alertEmoji: { fontSize:18 },
  alertText: { flex:1, fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], color:colors.text_primary },
  alertX: { fontSize:16, color:colors.text_secondary, padding:4 },

  // FAB
  fabPosition: { position:"absolute", right:16, zIndex:10 },
  fabWrap: {},
  fab: { width:layout.fabSize, height:layout.fabSize, borderRadius:layout.fabSize/2, backgroundColor:colors.brand_blue, alignItems:"center", justifyContent:"center", ...shadows.xl },
  fabIcon: { fontSize:24 },

  // Sheet
  sheetPad: { flex:1, paddingHorizontal:16, paddingTop:4 },

  // Chips
  chipsRow: { paddingVertical:8, gap:8 },
  chip: { flexDirection:"row", alignItems:"center", height:layout.chipHeight, paddingHorizontal:14, borderRadius:radius.pill, backgroundColor:colors.surface_2, borderWidth:1, borderColor:colors.border, gap:6 },
  chipAdd: { borderStyle:"dashed" },
  chipIcon: { fontSize:15 },
  chipAddIcon: { fontSize:16, color:colors.text_secondary, fontWeight:fontWeight.bold },
  chipLabel: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], fontWeight:fontWeight.medium, color:colors.text_primary },

  // Section
  section: { marginTop: spacing[4] },
  sectionTitle: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[18], fontWeight:fontWeight.bold, color:colors.text_primary, marginBottom:12 },
  stopsScroll: { gap:10, paddingBottom:4 },
  emptyHint: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], color:colors.text_tertiary, textAlign:"center", paddingVertical:20 },

  // Stop card
  stopCard: { width:88, height:110, borderRadius:radius.card, backgroundColor:colors.surface, overflow:"hidden", ...shadows.sm },
  stopModeBar: { height:4, width:"100%" },
  stopCardInner: { flex:1, padding:8, justifyContent:"space-between" },
  stopName: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], fontWeight:fontWeight.bold, color:colors.text_primary, textAlign:"right", lineHeight:18 },
  stopMeta: { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  stopDist: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[11], color:colors.text_tertiary },

  // Search large
  searchFieldLarge: { height:52, borderRadius:radius.card, backgroundColor:colors.surface_2, justifyContent:"center", paddingHorizontal:16, marginTop:8 },
  searchFieldPlaceholder: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[16], color:colors.text_tertiary },
});

export default HomeScreen;
