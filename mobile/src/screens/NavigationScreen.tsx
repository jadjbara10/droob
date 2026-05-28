// ============================================================================
// دروب (Droob) — ActiveTripScreen (Navigation Mode)
// Top bar with route progress + ETA, main instruction card, next step preview
// ============================================================================

import React, { useState, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withTiming, withRepeat, withSequence, FadeIn } from "react-native-reanimated";
import { colors, radius, fontSize, fontWeight, shadows } from "@theme/tokens";
import { CountdownTimer } from "@components/CountdownTimer";
import { TransitBadge } from "@components/TransitBadge";
import type { TransitMode } from "@theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Mock Trip Data ─────────────────────────────────────────────────────────

const MOCK_TRIP = {
  routeCode: "BRT1", routeName: "الباص السريع 1", mode: "brt" as TransitMode,
  currentInstruction: "اركب باص BRT1", currentStepAr: "اركب من محطة الجاردنز",
  nextInstruction: "انزل عند دوار الداخلية", nextStepAr: "٤ محطات متبقية",
  eta: "٩:٤٢ ص", progress: 0.35, waitMinutes: 3,
};

// ─── Direction Arrow ────────────────────────────────────────────────────────

const DirectionArrow: React.FC = () => {
  const rotation = useSharedValue(0);
  useEffect(() => {
    rotation.value = withRepeat(withSequence(withTiming(-5, { duration: 800 }), withTiming(5, { duration: 800 })), -1, true);
  }, []);
  const arrowStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.value}deg` }] }));
  return (
    <Animated.View style={[styles.arrowBox, arrowStyle]}>
      <Text style={styles.arrowIcon}>↑</Text>
    </Animated.View>
  );
};

// ─── MAIN SCREEN ────────────────────────────────────────────────────────────

const NavigationScreen: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.root}>
      {/* Top Bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + 4 }]}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeIcon}>✕</Text>
          </TouchableOpacity>
          <View style={styles.topInfo}>
            <Text style={styles.topLabel}>تصل الساعة</Text>
            <Text style={styles.topEta}>{MOCK_TRIP.eta}</Text>
          </View>
          <TransitBadge mode={MOCK_TRIP.mode} code={MOCK_TRIP.routeCode} size="sm" />
        </View>
        {/* Progress Bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${MOCK_TRIP.progress * 100}%` }]} />
        </View>
      </View>

      {/* Map Area Placeholder */}
      <View style={styles.mapArea}>
        <Text style={styles.mapPlaceholder}>🗺️</Text>
        <Text style={styles.mapLabel}>الخريطة المباشرة</Text>
      </View>

      {/* Instruction Card */}
      <Animated.View entering={FadeIn.duration(400)} style={[styles.instrCard, { paddingBottom: insets.bottom + 16 }]}>
        <View style={styles.instrMain}>
          <DirectionArrow />
          <View style={styles.instrText}>
            <Text style={styles.instrTitle}>{MOCK_TRIP.currentInstruction}</Text>
            <Text style={styles.instrSub}>{MOCK_TRIP.currentStepAr}</Text>
            <View style={styles.instrTimer}>
              <CountdownTimer minutes={MOCK_TRIP.waitMinutes} size="md" />
              <Text style={styles.instrDepart}>يغادر خلال</Text>
            </View>
          </View>
        </View>
        {/* Next Step Preview */}
        <View style={styles.nextStep}>
          <View style={styles.nextDot} />
          <Text style={styles.nextText}>{MOCK_TRIP.nextStepAr}</Text>
          <Text style={styles.nextHint}>{MOCK_TRIP.nextInstruction}</Text>
        </View>
      </Animated.View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex:1, backgroundColor:colors.surface },

  // Top bar
  topBar: { backgroundColor:colors.brand_blue, paddingHorizontal:16, paddingBottom:12 },
  topRow: { flexDirection:"row", alignItems:"center", justifyContent:"space-between" },
  closeBtn: { width:36, height:36, borderRadius:18, backgroundColor:"rgba(255,255,255,0.2)", alignItems:"center", justifyContent:"center" },
  closeIcon: { color:"#fff", fontSize:16, fontWeight:fontWeight.bold },
  topInfo: { alignItems:"center" },
  topLabel: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], color:"rgba(255,255,255,0.7)" },
  topEta: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[20], fontWeight:fontWeight.bold, color:"#fff" },
  progressTrack: { height:3, backgroundColor:"rgba(255,255,255,0.2)", borderRadius:2, marginTop:8 },
  progressFill: { height:"100%", backgroundColor:"#fff", borderRadius:2 },

  // Map
  mapArea: { flex:1, backgroundColor:colors.surface_2, alignItems:"center", justifyContent:"center" },
  mapPlaceholder: { fontSize:64 },
  mapLabel: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], color:colors.text_tertiary, marginTop:8 },

  // Instruction card
  instrCard: { backgroundColor:colors.surface, borderTopLeftRadius:radius.bottomSheet, borderTopRightRadius:radius.bottomSheet, paddingHorizontal:20, paddingTop:20, ...shadows.xl },
  instrMain: { flexDirection:"row", gap:16, marginBottom:16 },
  arrowBox: { width:48, height:48, borderRadius:24, backgroundColor:colors.brand_blue+"15", alignItems:"center", justifyContent:"center" },
  arrowIcon: { fontSize:28, color:colors.brand_blue },
  instrText: { flex:1 },
  instrTitle: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[20], fontWeight:fontWeight.bold, color:colors.text_primary },
  instrSub: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], color:colors.text_secondary, marginTop:4 },
  instrTimer: { flexDirection:"row", alignItems:"baseline", gap:6, marginTop:8 },
  instrDepart: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], color:colors.text_secondary },

  // Next step
  nextStep: { flexDirection:"row", alignItems:"center", backgroundColor:colors.surface_2, borderRadius:radius.card, padding:12, gap:10, marginBottom:8 },
  nextDot: { width:8, height:8, borderRadius:4, backgroundColor:colors.text_tertiary },
  nextText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[13], color:colors.text_secondary, flex:1 },
  nextHint: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[11], color:colors.text_tertiary },
});

export default NavigationScreen;
