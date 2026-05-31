// ============================================================================
// دروب (Droob) — Auth Screen
// Phone OTP (primary) + Google/Apple sign-in (stubbed)
// Jordan phone format +962, Arabic UI, RTL layout
// ============================================================================

import React, { useState, useCallback, useRef } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, Platform, KeyboardAvoidingView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { colors, radius, spacing, fontSize, fontWeight, shadows, layout } from "@theme/tokens";

type Step = "phone" | "otp";

// ─── MAIN SCREEN ───────────────────────────────────────────────────────────
export default function AuthScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const otpRefs = useRef<TextInput[]>([]);

  const handleSendOTP = useCallback(() => {
    const cleaned = phone.replace(/\s/g, "").replace(/^\+962/, "0");
    if (cleaned.length < 9) {
      Alert.alert("تنبيه", "الرجاء إدخال رقم هاتف صحيح");
      return;
    }
    // Simulate OTP send
    setStep("otp");
  }, [phone]);

  const handleVerifyOTP = useCallback(() => {
    const code = otp.join("");
    if (code.length < 6) {
      Alert.alert("تنبيه", "الرجاء إدخال رمز التحقق كاملاً");
      return;
    }
    // Simulate verification + update app store
    Alert.alert("تم", "تم تسجيل الدخول بنجاح", [
      { text: "متابعة", onPress: () => navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] }) },
    ]);
  }, [otp, navigation]);

  const handleOtpDigit = useCallback((text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text.slice(-1);
    setOtp(newOtp);
    // Auto-advance
    if (text && index < 5) otpRefs.current[index + 1]?.focus();
  }, [otp]);

  const handleSkip = useCallback(() => {
    navigation.reset({ index: 0, routes: [{ name: "MainTabs" }] });
  }, [navigation]);

  return (
    <ErrorBoundary>
      <KeyboardAvoidingView style={[styles.root, { paddingTop: insets.top + 24 }]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={styles.container}>
          {/* Logo */}
          <View style={styles.logoWrap}>
            <Text style={styles.logo}>🚌</Text>
            <Text style={styles.appName}>دروب</Text>
            <Text style={styles.tagline}>تنقل بذكاء في الأردن</Text>
          </View>

          {step === "phone" ? (
            <>
              <Text style={styles.heading}>أهلاً بك</Text>
              <Text style={styles.subtitle}>أدخل رقم هاتفك للمتابعة</Text>

              <View style={styles.phoneRow}>
                <View style={styles.countryCode}>
                  <Text style={styles.countryCodeText}>🇯🇴 +962</Text>
                </View>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="7X XXX XXXX"
                  placeholderTextColor={colors.text_tertiary}
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  textAlign="right"
                  returnKeyType="done"
                  onSubmitEditing={handleSendOTP}
                />
              </View>

              <TouchableOpacity style={styles.primaryBtn} onPress={handleSendOTP}>
                <Text style={styles.primaryBtnText}>إرسال رمز التحقق</Text>
              </TouchableOpacity>

              <View style={styles.dividerRow}>
                <View style={styles.divider} />
                <Text style={styles.dividerText}>أو</Text>
                <View style={styles.divider} />
              </View>

              <TouchableOpacity style={styles.socialBtn}>
                <Text style={styles.socialBtnText}>G  متابعة بواسطة Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.socialBtn, styles.appleBtn]}>
                <Text style={[styles.socialBtnText, styles.appleBtnText]}>  متابعة بواسطة Apple</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <Text style={styles.heading}>تأكيد الرقم</Text>
              <Text style={styles.subtitle}>تم إرسال رمز تحقق من 6 أرقام إلى {phone || "رقمك"}</Text>

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

              <TouchableOpacity style={styles.primaryBtn} onPress={handleVerifyOTP}>
                <Text style={styles.primaryBtnText}>تأكيد</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn} onPress={() => setStep("phone")}>
                <Text style={styles.linkText}>تغيير رقم الهاتف</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.linkBtn}>
                <Text style={styles.linkText}>إعادة إرسال الرمز</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity style={styles.skipBtn} onPress={handleSkip}>
            <Text style={styles.skipText}>تخطي التسجيل · استخدم التطبيق الآن</Text>
          </TouchableOpacity>

          <Text style={styles.terms}>
            بتسجيل الدخول، أنت توافق على الشروط والأحكام وسياسة الخصوصية
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface },
  container: { flex: 1, paddingHorizontal: spacing[6], justifyContent: "center" },

  logoWrap: { alignItems: "center", marginBottom: spacing[8] },
  logo: { fontSize: 56 },
  appName: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[32], fontWeight: fontWeight.bold, color: colors.brand_blue, marginTop: spacing[2] },
  tagline: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, marginTop: spacing[1] },

  heading: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[24], fontWeight: fontWeight.bold, color: colors.text_primary, textAlign: "center", marginBottom: spacing[1] },
  subtitle: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary, textAlign: "center", marginBottom: spacing[6] },

  phoneRow: { flexDirection: "row", alignItems: "center", gap: spacing[2], marginBottom: spacing[4] },
  countryCode: { backgroundColor: colors.surface_2, borderRadius: radius.input, paddingHorizontal: spacing[3], paddingVertical: spacing[3], borderWidth: 1, borderColor: colors.border },
  countryCodeText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_primary },
  phoneInput: { flex: 1, fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], color: colors.text_primary, backgroundColor: colors.surface_2, borderRadius: radius.input, paddingHorizontal: spacing[4], paddingVertical: spacing[3], borderWidth: 1, borderColor: colors.border, textAlign: "right" },

  primaryBtn: { backgroundColor: colors.brand_blue, borderRadius: radius.pill, paddingVertical: spacing[3], alignItems: "center", marginBottom: spacing[4] },
  primaryBtnText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold, color: colors.white },

  dividerRow: { flexDirection: "row", alignItems: "center", gap: spacing[3], marginBottom: spacing[4] },
  divider: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], color: colors.text_tertiary },

  socialBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", backgroundColor: colors.surface_2, borderRadius: radius.pill, paddingVertical: spacing[3], marginBottom: spacing[2], borderWidth: 1, borderColor: colors.border },
  socialBtnText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], fontWeight: fontWeight.medium, color: colors.text_primary },
  appleBtn: { backgroundColor: colors.black },
  appleBtnText: { color: colors.white },

  otpRow: { flexDirection: "row", justifyContent: "center", gap: spacing[2], marginBottom: spacing[6] },
  otpBox: { width: 48, height: 56, borderRadius: radius.input, borderWidth: 2, borderColor: colors.border, backgroundColor: colors.surface_2, fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[22], fontWeight: fontWeight.bold, color: colors.text_primary },
  otpBoxFilled: { borderColor: colors.brand_blue, backgroundColor: colors.brand_blue + "10" },

  linkBtn: { alignItems: "center", paddingVertical: spacing[2] },
  linkText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.brand_blue, fontWeight: fontWeight.medium },

  skipBtn: { alignItems: "center", marginTop: spacing[8], paddingVertical: spacing[3] },
  skipText: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], color: colors.text_secondary },

  terms: { fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[11], color: colors.text_tertiary, textAlign: "center", marginTop: spacing[4], paddingHorizontal: spacing[6] },
});
