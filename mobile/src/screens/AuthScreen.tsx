// ============================================================================
// دروب (Droob) — Auth Screen (Email-based)
// Register: Email → Code → Name + Password
// Login: Email + Password (direct)
// Guest mode available via Skip button
// ============================================================================

import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Alert, Platform, KeyboardAvoidingView, ScrollView, ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout, gradients } from "@theme/tokens";
import { apiFetch, setAuthToken } from "@services/api-client";

type Step = "email" | "verify" | "login";
type Mode = "register" | "login";

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const [mode, setMode] = useState<Mode>("register");
  const [step, setStep] = useState<Step>("email");

  // Fields
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const otpRefs = useRef<TextInput[]>([]);

  // ──── Send Verification Code ────
  const handleSendCode = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      Alert.alert("تنبيه", "الرجاء إدخال بريد إلكتروني صحيح");
      return;
    }

    setLoading(true);
    try {
      await apiFetch("/auth/send-code", {
        method: "POST",
        body: { email: trimmed, purpose: "verify", lang: "ar" },
      });
      setStep("verify");
    } catch (err: any) {
      const msg = err?.message || "تعذر إرسال رمز التحقق";
      Alert.alert("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }, [email]);

  // ──── Verify Code & Register ────
  const handleVerifyAndSubmit = useCallback(async () => {
    const code = otp.join("");
    const trimmed = email.trim().toLowerCase();

    if (code.length !== 6) {
      Alert.alert("تنبيه", "الرجاء إدخال رمز التحقق كاملاً (6 أرقام)");
      return;
    }

    if (!name.trim()) {
      Alert.alert("تنبيه", "الرجاء إدخال الاسم");
      return;
    }

    if (!password || password.length < 8) {
      Alert.alert("تنبيه", "كلمة المرور يجب أن تكون 8 أحرف على الأقل");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Verify the code
      await apiFetch("/auth/verify-code", {
        method: "POST",
        body: { email: trimmed, code, purpose: "verify" },
      });

      // Step 2: Register
      const data: any = await apiFetch("/auth/register", {
        method: "POST",
        body: { email: trimmed, password, name: name.trim(), preferredLang: "ar" },
      });

      // Store token
      setAuthToken(data.accessToken);

      Alert.alert("🎉 مرحباً!", `تم إنشاء حسابك بنجاح، ${data.user.name}!`, [
        { text: "متابعة", onPress: () => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] }) },
      ]);
    } catch (err: any) {
      const msg = err?.message || "حدث خطأ أثناء إنشاء الحساب";
      Alert.alert("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }, [otp, email, password, name, navigation]);

  // ──── Direct Login (email + password) ────
  const handleLogin = useCallback(async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !password) {
      Alert.alert("تنبيه", "الرجاء إدخال البريد الإلكتروني وكلمة المرور");
      return;
    }

    setLoading(true);
    try {
      const data: any = await apiFetch("/auth/login", {
        method: "POST",
        body: { email: trimmed, password },
      });

      setAuthToken(data.accessToken);

      Alert.alert("👋 أهلاً!", `مرحباً بعودتك، ${data.user.name}!`, [
        { text: "متابعة", onPress: () => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] }) },
      ]);
    } catch (err: any) {
      const msg = err?.message || "بريد إلكتروني أو كلمة مرور غير صحيحة";
      Alert.alert("خطأ", msg);
    } finally {
      setLoading(false);
    }
  }, [email, password, navigation]);

  // ──── Skip (Guest Mode) ────
  const handleSkip = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  }, [navigation]);

  // ──── OTP Digit Handler (with haptics) ────
  const handleOtpDigit = useCallback((text: string, index: number) => {
    if (text) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    if (text && index < 5) otpRefs.current[index + 1]?.focus();
    // Backspace → go to previous
    if (!text && index > 0) otpRefs.current[index - 1]?.focus();
  }, [otp]);

  // ──── RENDER ────
  return (
    <ErrorBoundary>
      <KeyboardAvoidingView
        style={[styles.root, { paddingTop: insets.top + 24 }]}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>🚌</Text>
            <Text style={styles.appName}>دروب</Text>
            <Text style={styles.tagline}>تنقل بذكاء في الأردن</Text>
          </View>

          {/* ── MODE TOGGLE ── */}
          <View style={styles.modeToggle}>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "register" && styles.modeBtnActive]}
              onPress={() => { setMode("register"); setStep("email"); }}
            >
              <Text style={[styles.modeBtnText, mode === "register" && styles.modeBtnTextActive]}>
                حساب جديد
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeBtn, mode === "login" && styles.modeBtnActive]}
              onPress={() => { setMode("login"); setStep("login"); }}
            >
              <Text style={[styles.modeBtnText, mode === "login" && styles.modeBtnTextActive]}>
                تسجيل الدخول
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── LOGIN MODE (simple) ── */}
          {mode === "login" ? (
            <>
              <Text style={styles.heading}>تسجيل الدخول</Text>
              <Text style={styles.subtitle}>أدخل بريدك الإلكتروني وكلمة المرور</Text>

              <TextInput
                style={styles.input}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={colors.text_tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
              />

              <TextInput
                style={styles.input}
                placeholder="كلمة المرور"
                placeholderTextColor={colors.text_tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="right"
                onSubmitEditing={handleLogin}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>دخول</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={() => { setMode("register"); setStep("email"); }}>
                <Text style={styles.linkText}>ليس لديك حساب؟ أنشئ حساباً جديداً</Text>
              </TouchableOpacity>
            </>
          ) : step === "email" ? (
            /* ── REGISTER STEP 1: EMAIL ── */
            <>
              <Text style={styles.heading}>أهلاً بك</Text>
              <Text style={styles.subtitle}>أدخل بريدك الإلكتروني لإنشاء حساب</Text>

              <TextInput
                style={styles.input}
                placeholder="البريد الإلكتروني"
                placeholderTextColor={colors.text_tertiary}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                textAlign="right"
                onSubmitEditing={handleSendCode}
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleSendCode}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>إرسال رمز التحقق</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={() => { setMode("login"); setStep("login"); }}>
                <Text style={styles.linkText}>لديك حساب بالفعل؟ سجل دخول</Text>
              </TouchableOpacity>
            </>
          ) : (
            /* ── REGISTER STEP 2: CODE + DETAILS ── */
            <>
              <Text style={styles.heading}>تأكيد البريد</Text>
              <Text style={styles.subtitle}>
                تم إرسال رمز تحقق من 6 أرقام إلى{"\n"}{email}
              </Text>

              {/* OTP Boxes */}
              <View style={styles.otpRow}>
                {otp.map((digit, i) => (
                  <TextInput
                    key={i}
                    ref={(ref) => { otpRefs.current[i] = ref!; }}
                    style={[styles.otpBox, digit ? styles.otpBoxFilled : null]}
                    value={digit}
                    onChangeText={(t) => handleOtpDigit(t, i)}
                    keyboardType="number-pad"
                    maxLength={1}
                    textAlign="center"
                    selectTextOnFocus
                  />
                ))}
              </View>

              {/* Name */}
              <TextInput
                style={styles.input}
                placeholder="الاسم الكامل"
                placeholderTextColor={colors.text_tertiary}
                value={name}
                onChangeText={setName}
                textAlign="right"
              />

              {/* Password */}
              <TextInput
                style={styles.input}
                placeholder="كلمة المرور (8 أحرف على الأقل)"
                placeholderTextColor={colors.text_tertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                textAlign="right"
              />

              <TouchableOpacity
                style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
                onPress={handleVerifyAndSubmit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.primaryBtnText}>إنشاء حساب</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={() => setStep("email")}>
                <Text style={styles.linkText}>تغيير البريد الإلكتروني</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={handleSendCode}>
                <Text style={styles.linkText}>إعادة إرسال الرمز</Text>
              </TouchableOpacity>
            </>
          )}

          {/* ── GUEST MODE / TERMS ── */}
          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>متابعة كضيف · استخدم التطبيق الآن</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            بتسجيل الدخول، أنت توافق على الشروط والأحكام وسياسة الخصوصية
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}

// ──── STYLES (Modern 2025 UI) ────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#F8FAFC" },
  container: { paddingHorizontal: spacing[6], justifyContent: "center", paddingBottom: 40 },

  // Logo section
  logoWrap: { alignItems: "center", marginBottom: spacing[8] },
  logo: {
    width: 80, height: 80, borderRadius: 24, backgroundColor: colors.brand_blue,
    alignItems: "center", justifyContent: "center", marginBottom: spacing[3],
    shadowColor: colors.brand_blue, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 10,
    overflow: "hidden",
  },
  appName: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[32], fontWeight: fontWeight.bold, color: colors.brand_blue, marginTop: spacing[2] },
  tagline: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, marginTop: spacing[1] },

  // Mode toggle — glass pill style
  modeToggle: {
    flexDirection: "row", backgroundColor: colors.surface_2, borderRadius: radius.pill, padding: 3, marginBottom: spacing[6],
    borderWidth: 0.5, borderColor: colors.border,
  },
  modeBtn: { flex: 1, paddingVertical: spacing[3], alignItems: "center", borderRadius: radius.pill },
  modeBtnActive: {
    backgroundColor: colors.brand_blue,
    shadowColor: colors.brand_blue, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
  },
  modeBtnText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], fontWeight: fontWeight.medium, color: colors.text_secondary },
  modeBtnTextActive: { color: colors.white, fontWeight: fontWeight.semiBold },

  heading: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[24], fontWeight: fontWeight.bold, color: colors.text_primary, textAlign: "center", marginBottom: spacing[1] },
  subtitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, textAlign: "center", marginBottom: spacing[6] },

  // Glass input — transparent bg with border, rounded
  input: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], color: colors.text_primary,
    backgroundColor: "rgba(255,255,255,0.8)", borderRadius: radius.xl,
    paddingHorizontal: spacing[5], paddingVertical: spacing[4],
    borderWidth: 1.5, borderColor: "rgba(0,0,0,0.08)",
    textAlign: "right", marginBottom: spacing[3],
    shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.03, shadowRadius: 4, elevation: 1,
  },

  // Gradient button (simulated with brand_blue + shadow)
  primaryBtn: {
    backgroundColor: colors.brand_blue, borderRadius: radius.pill,
    paddingVertical: spacing[4], alignItems: "center", marginBottom: spacing[3],
    shadowColor: colors.brand_blue, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 16, elevation: 8,
  },
  primaryBtnDisabled: { opacity: 0.5 },
  primaryBtnText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold, color: colors.white },

  // OTP boxes — separate, clean design
  otpRow: { flexDirection: "row", justifyContent: "center", gap: spacing[2], marginBottom: spacing[5] },
  otpBox: {
    width: 48, height: 60, borderRadius: radius.lg, borderWidth: 2, borderColor: "rgba(0,0,0,0.08)",
    backgroundColor: "rgba(255,255,255,0.8)", fontFamily: "IBM Plex Sans Arabic",
    fontSize: fontSize[24], fontWeight: fontWeight.bold, color: colors.text_primary,
    shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  otpBoxFilled: { borderColor: colors.brand_blue, backgroundColor: "rgba(26,79,138,0.06)", borderWidth: 2.5 },

  linkBtn: { alignItems: "center", paddingVertical: spacing[2] },
  linkText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.brand_blue, fontWeight: fontWeight.medium },

  // Guest mode — transparent style
  skipBtn: {
    alignItems: "center", marginTop: spacing[8], paddingVertical: spacing[3],
    borderWidth: 1, borderColor: "rgba(0,0,0,0.08)", borderRadius: radius.pill,
    marginHorizontal: spacing[4],
  },
  skipText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], color: colors.text_secondary, fontWeight: fontWeight.medium },

  terms: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary, textAlign: "center", marginTop: spacing[4], paddingHorizontal: spacing[6] },
});
