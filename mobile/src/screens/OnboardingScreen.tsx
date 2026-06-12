// ============================================================================
// دروب (Droob) — OnboardingScreen
// 5 slides, ScrollView paging (stable), permissions, login/skip, i18n
// ============================================================================

import React, { useState, useCallback, useRef, useMemo } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, Dimensions, ScrollView, NativeScrollEvent, NativeSyntheticEvent, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import * as Location from "expo-location";
import * as Notifications from "expo-notifications";
import * as Haptics from "expo-haptics";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming, withSequence, withSpring } from "react-native-reanimated";
import { colors, radius, fontSize, fontWeight, spacing, gradients, animationModern } from "@theme/tokens";
import { useAppStore } from "@stores/app.store";

const { width: SW, height: SH } = Dimensions.get("window");

// ─── Onboarding Data ────────────────────────────────────────────────────────

const SLIDE_KEYS = [
  {
    id: "1", icon: "🚌", gradient: [colors.brand_blue, colors.brand_green],
    titleKey: "onboarding.step1Title", subtitleKey: "onboarding.step1Subtitle", descKey: "onboarding.step1Desc",
  },
  {
    id: "2", icon: "🗺️", gradient: [colors.brand_blue, "#0F2B4C"],
    titleKey: "onboarding.step2Title", subtitleKey: "onboarding.step2Subtitle", descKey: "onboarding.step2Desc",
  },
  {
    id: "3", icon: "🛰️", gradient: ["#1A4F8A", "#1E6B4E"],
    titleKey: "onboarding.step3Title", subtitleKey: "onboarding.step3Subtitle", descKey: "onboarding.step3Desc",
  },
  {
    id: "4", icon: "🚀", gradient: ["#1A4F8A", colors.brand_green],
    titleKey: "onboarding.step4Title", subtitleKey: "onboarding.step4Subtitle", descKey: "onboarding.step4Desc",
    isSetup: true,
  },
  {
    id: "5", icon: "🔐", gradient: ["#1A4F8A", "#1A4F8A"],
    titleKey: "onboarding.step5Title", subtitleKey: "onboarding.step5Subtitle", descKey: "onboarding.step5Desc",
    isPermission: true,
  },
];

// ─── Animated Dot Progress ──────────────────────────────────────────────────

const AnimatedDot = ({ isActive }: { isActive: boolean }) => {
  const width = useSharedValue(isActive ? 24 : 8);
  const opacity = useSharedValue(isActive ? 1 : 0.4);

  React.useEffect(() => {
    width.value = withSpring(isActive ? 24 : 8, animationModern.springBouncy);
    opacity.value = withTiming(isActive ? 1 : 0.4, { duration: 300 });
  }, [isActive]);

  const dotStyle = useAnimatedStyle(() => ({
    width: width.value,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#fff",
    opacity: opacity.value,
  }));

  return <Animated.View style={dotStyle} />;
};

const ProgressDots = React.memo(({ total, active }: { total: number; active: number }) => (
  <View style={styles.dots}>
    {Array.from({ length: total }).map((_, i) => (
      <AnimatedDot key={i} isActive={i === active} />
    ))}
  </View>
));

// ─── Language Toggle ────────────────────────────────────────────────────────

const LangToggle = React.memo(({ onSelect }: { onSelect: (lang: "ar" | "en") => void }) => (
  <View style={styles.langRow}>
    <TouchableOpacity style={[styles.langPill, styles.langActive]} onPress={() => onSelect("ar")}>
      <Text style={[styles.langText, styles.langTextActive]}>العربية</Text>
    </TouchableOpacity>
    <TouchableOpacity style={styles.langPill} onPress={() => onSelect("en")}>
      <Text style={styles.langText}>English</Text>
    </TouchableOpacity>
  </View>
));

// ─── Single Slide (memoized) with FadeIn ─────────────────────────────────────
// NOTE: React Native does not support CSS gradients natively.
// For production, use expo-linear-gradient. The background simulates gradient depth
// using a primary color + opacity overlay of secondary color.

const AnimatedSlide = React.memo(({ item, insetsTop, isActive }: { item: any; insetsTop: number; isActive: boolean }) => {
  const fadeAnim = useSharedValue(isActive ? 1 : 0);
  const iconScale = useSharedValue(isActive ? 1 : 0.3);
  const textY = useSharedValue(isActive ? 0 : 30);

  React.useEffect(() => {
    if (isActive) {
      fadeAnim.value = withTiming(1, animationModern.entrance);
      iconScale.value = withSpring(1, animationModern.springBouncy);
      textY.value = withSpring(0, animationModern.spring);
    } else {
      fadeAnim.value = withTiming(0, { duration: 200 });
      iconScale.value = withTiming(0.3, { duration: 200 });
      textY.value = withTiming(30, { duration: 200 });
    }
  }, [isActive]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: fadeAnim.value,
    transform: [{ translateY: textY.value }],
  }));

  return (
    <View style={[styles.slide, { backgroundColor: item.gradient[0], width: SW }]}>
      <View style={[StyleSheet.absoluteFill, { backgroundColor: item.gradient[1] || item.gradient[0], opacity: 0.2 }]} />
      <View style={[styles.slideInner, { paddingTop: insetsTop + 60 }]}>
        <Animated.View style={iconStyle}>
          <Text style={styles.slideIcon}>{item.icon}</Text>
        </Animated.View>
        <Animated.View style={textStyle}>
          <Text style={styles.slideTitle}>{item.title}</Text>
          <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
          <Text style={styles.slideDesc}>{item.desc}</Text>
        </Animated.View>
      </View>
    </View>
  );
});

// ─── Pulse Button (last slide) ───────────────────────────────────────────────

const PulseButton = React.memo(({ onPress, label }: { onPress: () => void; label: string }) => {
  const pulse = useSharedValue(1);

  React.useEffect(() => {
    pulse.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000 }),
        withTiming(1, { duration: 1000 }),
      ),
      -1, // infinite
      true,
    );
  }, []);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }],
  }));

  return (
    <Animated.View style={[styles.ctaFull, pulseStyle]}>
      <TouchableOpacity onPress={onPress} activeOpacity={0.85} style={styles.ctaFullTouchable}>
        <Text style={styles.ctaFullIcon}>🚀</Text>
        <Text style={styles.ctaText}>{label}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

// ─── MAIN SCREEN ────────────────────────────────────────────────────────────

interface Props {
  onComplete: () => void;
  onLogin: () => void;
}

const OnboardingScreen: React.FC<Props> = ({ onComplete, onLogin }) => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [activeIdx, setActiveIdx] = useState(0);
  const [locationGranted, setLocationGranted] = useState(false);
  const [notifGranted, setNotifGranted] = useState(false);
  const scrollRef = useRef<ScrollView>(null);
  const isManualScroll = useRef(false);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);

  // Build slide data once (recomputes only when t changes = language switch)
  const slides = useMemo(
    () =>
      SLIDE_KEYS.map((s) => ({
        ...s,
        title: t(s.titleKey),
        subtitle: t(s.subtitleKey),
        desc: t(s.descKey),
      })),
    [t]
  );

  const requestLocation = useCallback(async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") setLocationGranted(true);
    } catch { setLocationGranted(true); }
  }, []);

  const requestNotifications = useCallback(async () => {
    try {
      const perm = await Notifications.requestPermissionsAsync();
      setNotifGranted((perm as any).granted || (perm as any).status === "granted");
    } catch { setNotifGranted(true); }
  }, []);

  // Scroll to specific slide with haptic feedback
  const scrollTo = useCallback((idx: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    isManualScroll.current = true;
    scrollRef.current?.scrollTo({ x: SW * idx, animated: true });
    setActiveIdx(idx);
    // Reset flag after animation
    setTimeout(() => { isManualScroll.current = false; }, 500);
  }, []);

  const goNext = useCallback(() => {
    if (activeIdx < slides.length - 1) {
      scrollTo(activeIdx + 1);
    }
  }, [activeIdx, slides.length, scrollTo]);

  const handleSkip = useCallback(() => {
    completeOnboarding();
    onComplete();
  }, [completeOnboarding, onComplete]);

  const handleSignIn = useCallback(() => {
    completeOnboarding();
    onLogin();
  }, [completeOnboarding, onLogin]);

  const handleLangSelect = useCallback(
    (lang: "ar" | "en") => { i18n.changeLanguage(lang); },
    [i18n]
  );

  // Handle scroll end — only update index if NOT a manual programmatic scroll
  const handleScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (isManualScroll.current) return;
    const idx = Math.round(e.nativeEvent.contentOffset.x / SW);
    setActiveIdx(idx);
  }, []);

  const isLast = activeIdx === slides.length - 1;
  const isPermission = slides[activeIdx]?.isPermission;

  return (
    <View style={styles.root}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        disableIntervalMomentum
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {slides.map((item, idx) => (
          <AnimatedSlide key={item.id} item={item} insetsTop={insets.top} isActive={idx === activeIdx} />
        ))}
      </ScrollView>

      {/* Language toggle (first slide only) */}
      {activeIdx === 0 && (
        <View style={[styles.langWrap, { top: insets.top + 16 }]}>
          <LangToggle onSelect={handleLangSelect} />
        </View>
      )}

      {/* Bottom controls */}
      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {isPermission && (
          <View style={styles.permissionRow}>
            <TouchableOpacity
              style={[styles.permBtn, locationGranted && styles.permBtnDone]}
              onPress={requestLocation}
              activeOpacity={0.7}
            >
              <Text style={styles.permIcon}>{locationGranted ? "✅" : "📍"}</Text>
              <Text style={styles.permLabel}>
                {locationGranted ? t("onboarding.activated") : t("onboarding.activateLocation")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.permBtn, notifGranted && styles.permBtnDone]}
              onPress={requestNotifications}
              activeOpacity={0.7}
            >
              <Text style={styles.permIcon}>{notifGranted ? "✅" : "🔔"}</Text>
              <Text style={styles.permLabel}>
                {notifGranted ? t("onboarding.activated") : t("onboarding.activateNotifications")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <ProgressDots total={slides.length} active={activeIdx} />

        {isLast ? (
          <View style={styles.finalRow}>
            <TouchableOpacity style={styles.ctaOutline} onPress={handleSkip}>
              <Text style={styles.ctaOutlineText}>{t("onboarding.skip")}</Text>
            </TouchableOpacity>
            <PulseButton onPress={handleSignIn} label={t("onboarding.signIn")} />
          </View>
        ) : (
          <View style={styles.bottomRow}>
            <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <Text style={styles.skip}>{t("onboarding.skip")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cta} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.ctaText}>{t("common.next")}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#0F172A" },
  scrollView: { flex: 1 },
  scrollContent: {},
  slide: { height: SH, justifyContent: "center", alignItems: "center" },
  slideInner: { flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: 32 },
  slideIcon: { fontSize: 80, marginBottom: 32 },
  slideTitle: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[32], fontWeight: fontWeight.bold,
    color: "#fff", textAlign: "center", marginBottom: 12,
  },
  slideSubtitle: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.medium,
    color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 24,
  },
  slideDesc: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: "rgba(255,255,255,0.7)",
    textAlign: "center", lineHeight: 24,
  },
  langWrap: { position: "absolute", left: 0, right: 0, alignItems: "center" },
  langRow: {
    flexDirection: "row", backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.pill, padding: 4, borderWidth: 0.5, borderColor: "rgba(255,255,255,0.2)",
  },
  langPill: { paddingHorizontal: 24, paddingVertical: 10, borderRadius: radius.pill },
  langActive: { backgroundColor: "#fff" },
  langText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.medium,
    color: "rgba(255,255,255,0.8)",
  },
  langTextActive: { color: colors.brand_blue },
  bottom: {
    position: "absolute", bottom: 0, left: 0, right: 0,
    paddingHorizontal: 24, paddingTop: 24,
    // Fade gradient overlay at bottom
    backgroundColor: "rgba(0,0,0,0.2)",
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
  },
  dots: { flexDirection: "row", justifyContent: "center", gap: 6, marginBottom: 28 },
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  finalRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  skip: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.medium,
    color: "rgba(255,255,255,0.7)", paddingVertical: 8, paddingHorizontal: 4,
  },
  cta: {
    backgroundColor: "#fff", borderRadius: radius.pill, paddingHorizontal: 44, paddingVertical: 16,
    shadowColor: "#fff", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
  },
  ctaFull: {
    flex: 1, backgroundColor: "#fff", borderRadius: radius.pill,
    shadowColor: "#fff", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 20, elevation: 10,
  },
  ctaFullTouchable: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    paddingVertical: 18, gap: 8,
  },
  ctaFullIcon: { fontSize: 20 },
  ctaText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold, color: colors.brand_blue,
  },
  ctaOutline: {
    flex: 1, borderRadius: radius.pill, paddingVertical: 14, alignItems: "center",
    borderWidth: 1.5, borderColor: "rgba(245, 158, 11, 0.6)", backgroundColor: "rgba(245,158,11,0.1)",
  },
  ctaOutlineText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.medium, color: "#F59E0B",
  },
  permissionRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  permBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.12)", borderRadius: radius.xl, paddingVertical: spacing[5], gap: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
  },
  permBtnDone: {
    backgroundColor: "rgba(16,185,129,0.25)", borderWidth: 1, borderColor: "rgba(16,185,129,0.5)",
  },
  permIcon: { fontSize: 20 },
  permLabel: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.medium, color: "#fff",
  },
});

export default React.memo(OnboardingScreen);
