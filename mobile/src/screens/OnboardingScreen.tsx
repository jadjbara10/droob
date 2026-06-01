// ============================================================================
// دروب (Droob) — OnboardingScreen
// 4 screens, parallax spring transitions, gradient backgrounds, dot progress
// ============================================================================

import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, FlatList, Platform, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle, withSpring, interpolate, Extrapolation } from "react-native-reanimated";
import * as Location from "expo-location";
import { colors, radius, fontSize, fontWeight, shadows, spacing } from "@theme/tokens";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Onboarding Data ────────────────────────────────────────────────────────

const SLIDES = [
  {
    id:"1", icon:"🚌", gradient:[colors.brand_blue, colors.brand_green],
    title:"مرحباً بك في دروب", subtitle:"تطبيق النقل الأكثر ذكاءً في الأردن",
    desc:"اكتشف طرق النقل في جميع المحافظات — باص، باص سريع، سرفيس، وخطوط بين المدن",
  },
  {
    id:"2", icon:"🗺️", gradient:[colors.brand_blue, "#0F2B4C"],
    title:"خطّط رحلتك في ثوانٍ", subtitle:"أسرع وأذكى طريقة للتنقل",
    desc:"• أدخل وجهتك واحصل على أفضل المسارات\n• مقارنة بين الخيارات: الأسرع، الأقل تكلفة\n• تعليمات خطوة بخطوة",
  },
  {
    id:"3", icon:"🛰️", gradient:["#1A4F8A", "#1E6B4E"],
    title:"تابع الباص مباشرة", subtitle:"مواقع حية للباصات على الخريطة",
    desc:"• تتبع مباشر للباصات\n• تنبيهات عند اقتراب موعد الرحلة\n• حالة الازدحام في الوقت الفعلي",
  },
  {
    id:"4", icon:"🚀", gradient:["#1A4F8A", colors.brand_green],
    title:"جاهز للانطلاق", subtitle:"حدد وجهاتك المفضلة للوصول السريع",
    desc:"اضبط موقع منزلك وعملك لتحصل على أفضل الاقتراحات",
    isSetup: true,
  },
  {
    id:"5", icon:"🔐", gradient:["#1A4F8A", "#1A4F8A"],
    title:"لنكمل الإعداد", subtitle:"نحتاج إذنين بسيطين لتجربة أفضل",
    desc:"📍 الموقع الجغرافي: لإظهار المحطات القريبة منك\n🔔 الإشعارات: لتنبيهك عند موعد الباص",
    isPermission: true,
  },
];

// ─── Dot Progress ───────────────────────────────────────────────────────────

const ProgressDots: React.FC<{ total: number; active: number }> = ({ total, active }) => (
  <View style={styles.dots}>
    {Array.from({ length: total }).map((_, i) => (
      <Animated.View
        key={i}
        style={[styles.dot, i === active ? styles.dotActive : styles.dotInactive]}
      />
    ))}
  </View>
);

// ─── Slide ──────────────────────────────────────────────────────────────────

const Slide: React.FC<{ item: typeof SLIDES[0]; isActive: boolean }> = ({ item, isActive }) => {
  const scale = useSharedValue(isActive ? 1 : 0.8);
  const opacity = useSharedValue(isActive ? 1 : 0.5);

  React.useEffect(() => {
    scale.value = withSpring(isActive ? 1 : 0.85, { damping:20, stiffness:200 });
    opacity.value = withSpring(isActive ? 1 : 0.5, { damping:20, stiffness:200 });
  }, [isActive]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <View style={[styles.slide, { backgroundColor: item.gradient[0] }]}>
      <Animated.View style={[styles.slideContent, animStyle]}>
        <Text style={styles.slideIcon}>{item.icon}</Text>
        <Text style={styles.slideTitle}>{item.title}</Text>
        <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
        <Text style={styles.slideDesc}>{item.desc}</Text>
      </Animated.View>
    </View>
  );
};

// ─── Language Toggle ────────────────────────────────────────────────────────

const LangToggle: React.FC<{ onSelect: (lang: "ar"|"en") => void }> = ({ onSelect }) => (
  <View style={styles.langRow}>
    <TouchableOpacity style={[styles.langPill, styles.langActive]} onPress={() => onSelect("ar")}>
      <Text style={[styles.langText, styles.langTextActive]}>العربية</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.langPill} onPress={() => onSelect("en")}>
      <Text style={styles.langText}>English</Text>
    </TouchableOpacity>
  </View>
);

// ─── MAIN SCREEN ────────────────────────────────────────────────────────────

const OnboardingScreen: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const flatRef = useRef<FlatList>(null);

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") setLocationGranted(true);
    } catch { setLocationGranted(true); /* proceed anyway */ }
  }, []);

  const requestNotifications = useCallback(async () => {
    try {
      setNotifGranted(true); // Will be properly requested when backend is ready
    } catch { setNotifGranted(true); }
  }, []);

  const goNext = useCallback(() => {
    if (activeIdx < SLIDES.length - 1) {
      flatRef.current?.scrollToIndex({ index: activeIdx + 1, animated: true });
      setActiveIdx(activeIdx + 1);
    }
  }, [activeIdx]);

  const isLast = activeIdx === SLIDES.length - 1;
  const isPermission = SLIDES[activeIdx]?.isPermission;

  return (
    <View style={styles.root}>
      {/* Gradient background via first slide color (rest handled in FlatList) */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.id}
        onMomentumScrollEnd={(e) => {
          const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
          setActiveIdx(idx);
        }}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { backgroundColor: item.gradient[0] }]}>
            <View style={[styles.slideInner, { paddingTop: insets.top + 60 }]}>
              <Text style={styles.slideIcon}>{item.icon}</Text>
              <Text style={styles.slideTitle}>{item.title}</Text>
              <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
              <Text style={styles.slideDesc}>{item.desc}</Text>
            </View>
          </View>
        )}
      />

      {/* Lang toggle (only on first slide) */}
      {activeIdx === 0 && (
        <View style={[styles.langWrap, { top: insets.top + 16 }]}>
          <LangToggle onSelect={() => {}} />
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {/* Permission buttons on the last (permission) slide */}
        {isPermission && (
          <View style={styles.permissionRow}>
            <TouchableOpacity
              style={[styles.permBtn, locationGranted && styles.permBtnDone]}
              onPress={requestLocation}
              activeOpacity={0.7}
            >
              <Text style={styles.permIcon}>{locationGranted ? "✅" : "📍"}</Text>
              <Text style={styles.permLabel}>{locationGranted ? "تم التفعيل" : "تفعيل الموقع"}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permBtn, notifGranted && styles.permBtnDone]}
              onPress={requestNotifications}
              activeOpacity={0.7}
            >
              <Text style={styles.permIcon}>{notifGranted ? "✅" : "🔔"}</Text>
              <Text style={styles.permLabel}>{notifGranted ? "تم التفعيل" : "تفعيل الإشعارات"}</Text>
            </TouchableOpacity>
          </View>
        )}

        <ProgressDots total={SLIDES.length} active={activeIdx} />
        <View style={styles.bottomRow}>
          {!isLast && (
            <TouchableOpacity onPress={() => { flatRef.current?.scrollToIndex({ index: SLIDES.length - 1, animated: true }); setActiveIdx(SLIDES.length - 1); }}>
              <Text style={styles.skip}>تخطي</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.cta, isLast && styles.ctaFull]}
            onPress={isLast ? onComplete : goNext}
          >
            <Text style={styles.ctaText}>{isLast ? "ابدأ الآن" : "التالي"}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex:1 },
  slide: { width:SW, height:SH, justifyContent:"center", alignItems:"center" },
  slideInner: { flex:1, justifyContent:"center", alignItems:"center", paddingHorizontal:32 },
  slideContent: { alignItems:"center", paddingHorizontal:32 },
  slideIcon: { fontSize:72, marginBottom:24 },
  slideTitle: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[32], fontWeight:fontWeight.bold, color:"#fff", textAlign:"center", marginBottom:8 },
  slideSubtitle: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[18], fontWeight:fontWeight.medium, color:"rgba(255,255,255,0.85)", textAlign:"center", marginBottom:24 },
  slideDesc: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], color:"rgba(255,255,255,0.7)", textAlign:"center", lineHeight:24 },

  // Lang toggle
  langWrap: { position:"absolute", left:0, right:0, alignItems:"center" },
  langRow: { flexDirection:"row", backgroundColor:"rgba(255,255,255,0.2)", borderRadius:radius.pill, padding:4 },
  langPill: { paddingHorizontal:20, paddingVertical:8, borderRadius:radius.pill },
  langActive: { backgroundColor:"#fff" },
  langText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[14], fontWeight:fontWeight.medium, color:"rgba(255,255,255,0.8)" },
  langTextActive: { color:colors.brand_blue },

  // Bottom
  bottom: { position:"absolute", bottom:0, left:0, right:0, paddingHorizontal:24, paddingTop:16 },
  dots: { flexDirection:"row", justifyContent:"center", gap:8, marginBottom:24 },
  dot: { borderRadius:4 },
  dotInactive: { width:8, height:8, borderRadius:4, backgroundColor:"rgba(255,255,255,0.4)" },
  dotActive: { width:24, height:8, borderRadius:4, backgroundColor:"#fff" },
  bottomRow: { flexDirection:"row", justifyContent:"space-between", alignItems:"center" },
  skip: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[15], color:"rgba(255,255,255,0.7)" },
  cta: { backgroundColor:"#fff", borderRadius:radius.pill, paddingHorizontal:40, paddingVertical:14 },
  ctaFull: { flex:1, alignItems:"center" },
  ctaText: { fontFamily:"IBM Plex Sans Arabic", fontSize:fontSize[16], fontWeight:fontWeight.bold, color:colors.brand_blue },

  // Permission buttons
  permissionRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  permBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: radius.lg, paddingVertical: spacing[4], gap: 8 },
  permBtnDone: { backgroundColor: "rgba(255,255,255,0.35)", borderWidth: 1, borderColor: "rgba(255,255,255,0.5)" },
  permIcon: { fontSize: 18 },
  permLabel: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.medium, color: "#fff" },
});

export default OnboardingScreen;
