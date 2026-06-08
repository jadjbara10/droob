// ============================================================================
// دروب (Droob) — ProfileScreen (My Account tab)
// Guest + Authenticated views, settings, i18n
// ============================================================================
import { useRewardedAd } from "@components/AdRewarded";
import { AD_REWARDED_REMOVE_ADS, AD_REWARDED_OFFLINE_MAP } from "@config/ads";

import React, { useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { colors, radius, fontSize, fontWeight, spacing, shadows } from "@theme/tokens";
import { ErrorBoundary } from "@components/ErrorBoundary";
import { useAppStore } from "@stores/app.store";
import type { RootStackParamList } from "../navigation/AppNavigator";

type Nav = NativeStackNavigationProp<RootStackParamList>;

// ─── Settings Row ───────────────────────────────────────────────────────────

const SettingRow: React.FC<{
  icon: string; label: string; onPress?: () => void;
  right?: React.ReactNode; danger?: boolean;
}> = ({ icon, label, onPress, right, danger }) => (
  <TouchableOpacity style={styles.settingRow} onPress={onPress} disabled={!onPress}>
    <Text style={styles.settingIcon}>{icon}</Text>
    <Text style={[styles.settingLabel, danger && { color: "#DC2626" }]}>
      {label}
    </Text>
    {right || <Text style={styles.settingArrow}>›</Text>}
  </TouchableOpacity>
);

// ─── MAIN ───────────────────────────────────────────────────────────────────

const ProfileScreen: React.FC = () => {
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<Nav>();

  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const displayName = useAppStore((s) => s.displayName);
  const phoneNumber = useAppStore((s) => s.phoneNumber);
  const notificationsEnabled = useAppStore((s) => s.notificationsEnabled);
  const setNotifications = useAppStore((s) => s.setNotifications);

  // ── Ad hooks ───────────────────────────────────────────────────────────
  const rewardedRemoveAds = useRewardedAd(AD_REWARDED_REMOVE_ADS, "remove_ads_1h");
  const rewardedOfflineMap = useRewardedAd(AD_REWARDED_OFFLINE_MAP, "offline_map");
  const logout = useAppStore((s) => s.logout);
  const lang = i18n.language?.startsWith("en") ? "en" : "ar";

  const handleToggleNotifications = useCallback(
    (val: boolean) => {
      setNotifications(val);
    },
    [setNotifications]
  );

  const handleToggleLanguage = useCallback(() => {
    const next = lang === "ar" ? "en" : "ar";
    i18n.changeLanguage(next);
    Alert.alert(
      next === "ar" ? "تم تغيير اللغة" : "Language Changed",
      next === "ar"
        ? "اللغة تغيرت إلى العربية"
        : "Language changed to English. Restart app for full effect.",
    );
  }, [lang, i18n]);

  const handleSignIn = useCallback(() => {
    navigation.navigate("Auth");
  }, [navigation]);

  const handleLogout = useCallback(() => {
    Alert.alert(
      lang === "ar" ? "تسجيل الخروج" : "Sign Out",
      lang === "ar" ? "هل أنت متأكد من تسجيل الخروج؟" : "Are you sure you want to sign out?",
      [
        { text: lang === "ar" ? "إلغاء" : "Cancel", style: "cancel" },
        {
          text: lang === "ar" ? "تسجيل الخروج" : "Sign Out",
          style: "destructive",
          onPress: () => logout(),
        },
      ]
    );
  }, [logout, lang]);

  return (
    <ErrorBoundary>
      <ScrollView
        style={[styles.root, { paddingTop: insets.top + spacing[3] }]}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
        {/* Header */}
        <Text style={styles.title}>{t("profile.title")}</Text>

        {/* User Section */}
        {isAuthenticated ? (
          <View style={styles.userCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(displayName || "U")[0].toUpperCase()}
              </Text>
            </View>
            <View style={styles.userInfo}>
              <Text style={styles.userName}>{displayName || t("auth.phoneLogin")}</Text>
              {phoneNumber && <Text style={styles.userPhone}>{phoneNumber}</Text>}
            </View>
          </View>
        ) : (
          <View style={styles.guestCard}>
            <Text style={styles.guestTitle}>{t("profile.guestTitle")}</Text>
            <Text style={styles.guestSubtitle}>{t("profile.guestSubtitle")}</Text>
            <TouchableOpacity style={styles.signInBtn} onPress={handleSignIn}>
              <Text style={styles.signInBtnText}>{t("auth.signIn")}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Saved Routes */}
        {isAuthenticated && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("profile.savedRoutes")}</Text>
            <SettingRow icon="⭐" label={t("profile.savedRoutes")} onPress={() => navigation.navigate("SavedRoutes")} />
          </View>
        )}

        {/* Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.settings")}</Text>

          <SettingRow
            icon="🌐"
            label={`${t("profile.language")}: ${lang === "ar" ? "العربية" : "English"}`}
            onPress={handleToggleLanguage}
          />

          <View style={styles.settingRow}>
            <Text style={styles.settingIcon}>🔔</Text>
            <Text style={styles.settingLabel}>{t("profile.notifications")}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: colors.border, true: colors.brand_blue }}
            />
          </View>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("profile.about")}</Text>
          <SettingRow icon="📋" label={t("profile.privacy")} onPress={() => {}} />
          <SettingRow icon="📄" label={t("profile.terms")} onPress={() => {}} />
          <SettingRow
            icon="ℹ️"
            label={`${t("profile.version")}: 1.0.0`}
          />
        </View>

        {/* Logout */}
        {isAuthenticated && (
          <View style={styles.section}>
            <SettingRow
              icon="🚪"
              label={t("auth.signOut")}
              danger
              onPress={handleLogout}
              right={null}
            />
          </View>
        )}
      </ScrollView>
    </ErrorBoundary>
  );
};

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.surface, paddingHorizontal: spacing[4] },
  title: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[24], fontWeight: fontWeight.bold,
    color: colors.text_primary, marginBottom: spacing[4],
  },

  // Guest
  guestCard: {
    backgroundColor: colors.surface_2, borderRadius: radius.xl, padding: spacing[5],
    alignItems: "center", marginBottom: spacing[4],
  },
  guestTitle: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[18], fontWeight: fontWeight.bold,
    color: colors.text_primary, marginBottom: spacing[1],
  },
  guestSubtitle: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary,
    marginBottom: spacing[4],
  },
  signInBtn: {
    backgroundColor: colors.brand_blue, borderRadius: radius.pill,
    paddingHorizontal: spacing[6], paddingVertical: spacing[3],
  },
  signInBtnText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold,
    color: "#fff",
  },

  // User card
  userCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface_2,
    borderRadius: radius.xl, padding: spacing[4], marginBottom: spacing[4], gap: spacing[3],
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28, backgroundColor: colors.brand_blue,
    alignItems: "center", justifyContent: "center",
  },
  avatarText: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[22], fontWeight: fontWeight.bold,
    color: "#fff",
  },
  userInfo: { flex: 1 },
  userName: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[16], fontWeight: fontWeight.bold,
    color: colors.text_primary,
  },
  userPhone: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[14], color: colors.text_secondary,
    marginTop: 2,
  },

  // Sections
  section: { marginBottom: spacing[4] },
  sectionTitle: {
    fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[13], fontWeight: fontWeight.semiBold,
    color: colors.text_tertiary, marginBottom: spacing[1], marginLeft: spacing[2],
    textTransform: "uppercase", letterSpacing: 0.5,
  },

  // Setting rows
  settingRow: {
    flexDirection: "row", alignItems: "center", backgroundColor: colors.surface_2,
    paddingHorizontal: spacing[4], paddingVertical: spacing[3] + 2,
    borderRadius: radius.lg, marginBottom: spacing[1], gap: spacing[3],
  },
  settingIcon: { fontSize: 20 },
  settingLabel: {
    flex: 1, fontFamily: "IBM Plex Sans Arabic", fontSize: fontSize[15], color: colors.text_primary,
  },
  settingArrow: { fontSize: 20, color: colors.text_tertiary },
});

export default ProfileScreen;
