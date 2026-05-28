// ============================================================================
// دروب (Droob) — Auth Screen
// Phone OTP (primary), Google, Apple sign-in
// Arabic UI, RTL layout, Jordan phone format +962
// ============================================================================
import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView,
  Platform, StyleSheet, ActivityIndicator, Alert, I18nManager,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { COLORS } from '../config/transport.config';

// ─── Types ───────────────────────────────────────────────────────────────────
type AuthStep = 'phone' | 'otp' | 'profile';

// ─── Main Component ─────────────────────────────────────────────────────────
export default function AuthScreen() {
  const navigation = useNavigation();
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const otpInputs = useRef<(TextInput | null)[]>([]);

  // ─── Format phone as user types ────────────────────────────────────────
  const handlePhoneChange = useCallback((text: string) => {
    // Strip non-digits
    const digits = text.replace(/\D/g, '');
    // Jordan phone: 07X-XXX-XXXX after +962 prefix
    if (digits.startsWith('962')) {
      const rest = digits.slice(3);
      const formatted = `+962-${rest.slice(0, 2)}-${rest.slice(2, 5)}-${rest.slice(5, 9)}`;
      setPhoneNumber(formatted);
    } else if (digits.startsWith('0')) {
      const rest = digits.slice(1);
      const formatted = `+962-${rest.slice(0, 2)}-${rest.slice(2, 5)}-${rest.slice(5, 9)}`;
      setPhoneNumber(formatted);
    } else if (digits.length <= 2) {
      setPhoneNumber(`+962-${digits}`);
    } else if (digits.length <= 5) {
      setPhoneNumber(`+962-${digits.slice(0, 2)}-${digits.slice(2)}`);
    } else {
      const formatted = `+962-${digits.slice(0, 2)}-${digits.slice(2, 5)}-${digits.slice(5, 9)}`;
      setPhoneNumber(formatted);
    }
    setError('');
  }, []);

  // ─── OTP digit input ──────────────────────────────────────────────────
  const handleOtpDigit = useCallback((text: string, index: number) => {
    const digits = text.replace(/\D/g, '');
    const newOtp = [...otpCode];
    newOtp[index] = digits.slice(-1); // Only last digit
    setOtpCode(newOtp);

    // Auto-focus next input
    if (digits.length > 0 && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  }, [otpCode]);

  const handleOtpKeyPress = useCallback((key: string, index: number) => {
    if (key === 'Backspace' && otpCode[index] === '' && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  }, [otpCode]);

  // ─── Send OTP ─────────────────────────────────────────────────────────
  const handleSendOtp = useCallback(async () => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.length < 10) {
      setError('يرجى إدخال رقم هاتف صحيح');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In production: Firebase Phone Auth
      // await auth().signInWithPhoneNumber(phoneNumber);
      await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate API
      setAuthStep('otp');
    } catch (err: any) {
      setError('فشل إرسال رمز التحقق. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [phoneNumber]);

  // ─── Verify OTP ───────────────────────────────────────────────────────
  const handleVerifyOtp = useCallback(async () => {
    const code = otpCode.join('');
    if (code.length < 6) {
      setError('يرجى إدخال رمز التحقق كاملاً');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // In production: confirm code with Firebase
      // await confirmation.confirm(code);
      await new Promise(resolve => setTimeout(resolve, 800));
      // Navigate to home
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' as never }],
      });
    } catch (err) {
      setError('رمز التحقق غير صحيح. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, [otpCode, navigation]);

  // ─── Social sign-in ───────────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      // await GoogleSignin.signIn();
      await new Promise(resolve => setTimeout(resolve, 800));
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] });
    } catch {
      setError('فشل تسجيل الدخول. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAppleSignIn = useCallback(async () => {
    setLoading(true);
    try {
      // await appleAuth.performRequest({ ... });
      await new Promise(resolve => setTimeout(resolve, 800));
      navigation.reset({ index: 0, routes: [{ name: 'MainTabs' as never }] });
    } catch {
      setError('فشل تسجيل الدخول. حاول مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }, []);

  // ─── Skip auth ────────────────────────────────────────────────────────
  const handleSkip = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' as never }],
    });
  }, [navigation]);

  // ─── Phone input mask display ─────────────────────────────────────────
  const displayPhone = phoneNumber || '+962-';

  // ─── Render ─────────────────────────────────────────────────────────────
  if (authStep === 'otp') {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <View style={styles.content}>
            {/* Back button */}
            <TouchableOpacity
              style={styles.backBtn}
              onPress={() => { setAuthStep('phone'); setOtpCode(['', '', '', '', '', '']); setError(''); }}
            >
              <MaterialCommunityIcons name="arrow-right" size={24} color={COLORS.text} />
            </TouchableOpacity>

            {/* Header */}
            <Text style={styles.title}>تأكيد الرقم</Text>
            <Text style={styles.subtitle}>
              أدخل رمز التحقق المكون من ٦ أرقام الذي تم إرساله إلى
            </Text>
            <Text style={styles.phoneDisplay}>{displayPhone}</Text>

            {/* OTP inputs */}
            <View style={styles.otpRow}>
              {otpCode.map((digit, idx) => (
                <TextInput
                  key={idx}
                  ref={ref => { otpInputs.current[idx] = ref; }}
                  style={[
                    styles.otpInput,
                    digit ? styles.otpInputFilled : null,
                  ]}
                  value={digit}
                  onChangeText={(t) => handleOtpDigit(t, idx)}
                  onKeyPress={({ nativeEvent }) => handleOtpKeyPress(nativeEvent.key, idx)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  textAlign="center"
                  caretHidden
                />
              ))}
            </View>

            {/* Error */}
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            {/* Verify button */}
            <TouchableOpacity
              style={[styles.primaryBtn, otpCode.join('').length < 6 && styles.primaryBtnDisabled]}
              onPress={handleVerifyOtp}
              disabled={otpCode.join('').length < 6 || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryBtnText}>تأكيد</Text>
              )}
            </TouchableOpacity>

            {/* Resend */}
            <TouchableOpacity style={styles.resendBtn}>
              <Text style={styles.resendText}>إعادة إرسال الرمز (30)</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.content}>
          {/* Close / Skip */}
          <TouchableOpacity style={styles.backBtn} onPress={handleSkip}>
            <MaterialCommunityIcons name="close" size={22} color={COLORS.textSecondary} />
          </TouchableOpacity>

          {/* Logo / Title */}
          <View style={styles.logoBox}>
            <MaterialCommunityIcons name="bus-multiple" size={48} color={COLORS.primary} />
          </View>
          <Text style={styles.title}>تسجيل الدخول</Text>
          <Text style={styles.subtitle}>
            سجل دخولك لتتمتع بكل ميزات دروب وتتابع رحلاتك المفضلة
          </Text>

          {/* Phone input */}
          <View style={styles.phoneInputCard}>
            <Text style={styles.inputLabel}>رقم الهاتف</Text>
            <View style={styles.phoneRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇯🇴 +962</Text>
              </View>
              <TextInput
                style={styles.phoneNumberInput}
                placeholder="7X-XXX-XXXX"
                placeholderTextColor={COLORS.textSecondary}
                value={phoneNumber}
                onChangeText={handlePhoneChange}
                keyboardType="phone-pad"
                maxLength={18}
                textAlign={I18nManager.isRTL ? 'right' : 'left'}
              />
            </View>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Send OTP */}
          <TouchableOpacity
            style={[styles.primaryBtn, !phoneNumber && styles.primaryBtnDisabled]}
            onPress={handleSendOtp}
            disabled={!phoneNumber || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryBtnText}>إرسال رمز التحقق</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>أو</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Social buttons */}
          <TouchableOpacity
            style={[styles.socialBtn, styles.googleBtn]}
            onPress={handleGoogleSignIn}
            disabled={loading}
          >
            <MaterialCommunityIcons name="google" size={20} color="#DB4437" />
            <Text style={styles.socialBtnText}>متابعة باستخدام Google</Text>
          </TouchableOpacity>

          {Platform.OS === 'ios' && (
            <TouchableOpacity
              style={[styles.socialBtn, styles.appleBtn]}
              onPress={handleAppleSignIn}
              disabled={loading}
            >
              <MaterialCommunityIcons name="apple" size={20} color="#000000" />
              <Text style={styles.socialBtnText}>متابعة باستخدام Apple</Text>
            </TouchableOpacity>
          )}

          {/* Guest mode */}
          <TouchableOpacity style={styles.guestBtn} onPress={handleSkip}>
            <Text style={styles.guestText}>المتابعة كزائر</Text>
          </TouchableOpacity>

          {/* Terms */}
          <Text style={styles.termsText}>
            بتسجيل الدخول، أنت توافق على شروط الاستخدام وسياسة الخصوصية
          </Text>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  kav: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  backBtn: {
    position: 'absolute',
    top: 0,
    right: 0,
    padding: 8,
  },
  // Logo
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    textAlign: 'center',
    marginBottom: 8,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    fontFamily: 'IBM Plex Sans Arabic',
    marginBottom: 28,
  },
  phoneDisplay: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: 24,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  // Phone input
  phoneInputCard: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  phoneRow: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: 'hidden',
  },
  countryCode: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: COLORS.border,
  },
  countryCodeText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  phoneNumberInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    fontFamily: 'IBM Plex Sans Arabic',
    paddingHorizontal: 14,
    paddingVertical: 14,
    textAlign: 'right',
  },
  // Error
  errorText: {
    fontSize: 12,
    color: COLORS.cancelled,
    marginTop: 8,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  // OTP inputs
  otpRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 16,
  },
  otpInput: {
    width: 44,
    height: 52,
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    textAlign: 'center',
  },
  otpInputFilled: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary + '08',
  },
  // Primary button
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnDisabled: {
    backgroundColor: COLORS.border,
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    fontFamily: 'IBM Plex Sans Arabic',
  },
  // Resend
  resendBtn: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  resendText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textSecondary,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Social buttons
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    gap: 10,
  },
  googleBtn: {
    backgroundColor: '#FFFFFF',
  },
  appleBtn: {
    backgroundColor: '#000000',
    borderColor: '#000000',
  },
  socialBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  // Guest
  guestBtn: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  guestText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
    fontFamily: 'IBM Plex Sans Arabic',
  },
  // Terms
  termsText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 16,
    fontFamily: 'IBM Plex Sans Arabic',
  },
});