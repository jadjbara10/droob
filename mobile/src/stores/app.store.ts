// ============================================================================
// دروب (Droob) — Global App Store (Zustand)
// Manages: auth, onboarding, user prefs, location, alerts, connectivity
// ============================================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { MMKV } from 'react-native-mmkv';
const storage = new MMKV({ id: 'droob-app-store' });

const mmkvStorage = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

// ─── Types ────────────────────────────────────────────────────────
export type TransitMode = 'city_bus' | 'brt' | 'serveece' | 'intercity' | 'all';
export type ThemeMode = 'light' | 'dark' | 'system';
export type LanguageCode = 'ar' | 'en';

export interface UserPreferences {
  language: LanguageCode;
  homeAddress: string | null;
  homeCoords: [number, number] | null;
  workAddress: string | null;
  workCoords: [number, number] | null;
  transitFilters: TransitMode[];
  highContrast: boolean;
  offlineMode: boolean;
  notifications: boolean;
  prayerTimeAlerts: boolean;
  ramadanMode: boolean;
}

export interface Alert {
  id: string;
  type: 'delay' | 'diversion' | 'closure' | 'emergency' | 'maintenance';
  severity: 'info' | 'warning' | 'critical';
  message_ar: string;
  message_en: string;
  affectedRoutes: string[];
  startTime: string;
  endTime: string | null;
  isRead: boolean;
}

export interface AppState {
  // ─── Onboarding ──────────────────────────────────────────────────
  isOnboarded: boolean;
  onboardingComplete: boolean; // alias for isOnboarded
  setOnboarded: (value: boolean) => void;
  completeOnboarding: () => void;

  // ─── Auth ────────────────────────────────────────────────────────
  isAuthenticated: boolean;
  userId: string | null;
  phoneNumber: string | null;
  displayName: string | null;
  setAuthenticated: (valueOrUserId: boolean | string, phone?: string, name?: string) => void;
  logout: () => void;

  // ─── Language (flat, synced with preferences) ────────────────────
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;

  // ─── Theme ───────────────────────────────────────────────────────
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;

  // ─── User Preferences ────────────────────────────────────────────
  preferences: UserPreferences;
  setHomeAddress: (address: string, coords: [number, number]) => void;
  setWorkAddress: (address: string, coords: [number, number]) => void;
  toggleTransitFilter: (mode: TransitMode) => void;
  setHighContrast: (on: boolean) => void;
  setOfflineMode: (on: boolean) => void;
  setNotifications: (on: boolean) => void;
  setPrayerTimeAlerts: (on: boolean) => void;
  setRamadanMode: (on: boolean) => void;

  // ─── Location ────────────────────────────────────────────────────
  userLocation: [number, number] | null; // [lat, lng]
  locationPermission: 'denied' | 'granted' | 'undetermined';
  setUserLocation: (coords: [number, number]) => void;
  setLocationPermission: (status: 'denied' | 'granted' | 'undetermined') => void;

  // ─── Notifications ───────────────────────────────────────────────
  notificationsEnabled: boolean;
  toggleNotifications: () => void;

  // ─── Sync ────────────────────────────────────────────────────────
  lastSyncTimestamp: number | null;
  setLastSyncTimestamp: (ts: number) => void;

  // ─── Reset ───────────────────────────────────────────────────────
  resetState: () => void;

  // ─── Map ─────────────────────────────────────────────────────────
  mapCenter: [number, number]; // Default: Amman 4th Circle
  mapZoom: number;
  setMapView: (center: [number, number], zoom: number) => void;
  // Active trip tracking
  activeTrip: {
    tripId: string | null;
    routeId: string | null;
    vehicleId: string | null;
    currentStopIndex: number;
    nextStopName: string | null;
    etaMinutes: number | null;
  };
  setActiveTrip: (trip: Partial<AppState['activeTrip']>) => void;
  clearActiveTrip: () => void;

  // ─── Connectivity ────────────────────────────────────────────────
  isOnline: boolean;
  isOfflineMode: boolean;
  setOnline: (online: boolean) => void;

  // ─── Alerts ──────────────────────────────────────────────────────
  alerts: Alert[];
  unreadAlertCount: number;
  addAlert: (alert: Alert) => void;
  markAlertRead: (alertId: string) => void;
  clearAlerts: () => void;

  // ─── Community Reports ───────────────────────────────────────────
  communityReports: number;
  trustedContributor: boolean;
  incrementReports: () => void;

  // ─── Friday / Ramadan State ──────────────────────────────────────
  isFriday: boolean;
  isRamadan: boolean;
  setCalendarState: (friday: boolean, ramadan: boolean) => void;
}

// ─── Defaults ─────────────────────────────────────────────────────
const defaultPreferences: UserPreferences = {
  language: 'ar',
  homeAddress: null,
  homeCoords: null,
  workAddress: null,
  workCoords: null,
  transitFilters: ['all'],
  highContrast: false,
  offlineMode: false,
  notifications: true,
  prayerTimeAlerts: true,
  ramadanMode: false,
};

const DEFAULT_STATE = {
  isOnboarded: false,
  onboardingComplete: false,
  isAuthenticated: false,
  userId: null as string | null,
  phoneNumber: null as string | null,
  displayName: null as string | null,
  language: 'ar' as LanguageCode,
  theme: 'system' as ThemeMode,
  preferences: defaultPreferences,
  userLocation: null as [number, number] | null,
  locationPermission: 'undetermined' as 'denied' | 'granted' | 'undetermined',
  notificationsEnabled: true,
  lastSyncTimestamp: null as number | null,
  mapCenter: [31.9539, 35.9106] as [number, number],
  mapZoom: 13,
  activeTrip: {
    tripId: null as string | null,
    routeId: null as string | null,
    vehicleId: null as string | null,
    currentStopIndex: 0,
    nextStopName: null as string | null,
    etaMinutes: null as number | null,
  },
  isOnline: true,
  isOfflineMode: false,
  alerts: [] as Alert[],
  unreadAlertCount: 0,
  communityReports: 0,
  trustedContributor: false,
  isFriday: false,
  isRamadan: false,
};

// ─── Store ────────────────────────────────────────────────────────
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...DEFAULT_STATE,

      // ─── Onboarding ──────────────────────────────────────────────
      setOnboarded: (value) => set({ isOnboarded: value, onboardingComplete: value }),
      completeOnboarding: () => set({ isOnboarded: true, onboardingComplete: true }),

      // ─── Auth ────────────────────────────────────────────────────
      setAuthenticated: (valueOrUserId: boolean | string, phone?: string, name?: string) => {
        if (typeof valueOrUserId === 'boolean') {
          if (valueOrUserId) {
            set({ isAuthenticated: true });
          } else {
            set({
              isAuthenticated: false,
              userId: null,
              phoneNumber: null,
              displayName: null,
            });
          }
        } else {
          set({
            isAuthenticated: true,
            userId: valueOrUserId,
            phoneNumber: phone ?? null,
            displayName: name ?? null,
          });
        }
      },
      logout: () =>
        set({
          isAuthenticated: false,
          userId: null,
          phoneNumber: null,
          displayName: null,
        }),

      // ─── Language (flat + synced) ────────────────────────────────
      setLanguage: (lang) =>
        set((s) => ({
          language: lang,
          preferences: { ...s.preferences, language: lang },
        })),

      // ─── Theme ──────────────────────────────────────────────────
      setTheme: (theme) => set({ theme }),

      // ─── Preferences ────────────────────────────────────────────
      setHomeAddress: (address, coords) =>
        set((s) => ({
          preferences: { ...s.preferences, homeAddress: address, homeCoords: coords },
        })),
      setWorkAddress: (address, coords) =>
        set((s) => ({
          preferences: { ...s.preferences, workAddress: address, workCoords: coords },
        })),
      toggleTransitFilter: (mode) =>
        set((s) => {
          const current = s.preferences.transitFilters;
          if (mode === 'all') return { preferences: { ...s.preferences, transitFilters: ['all'] } };
          const withoutAll = current.filter((f) => f !== 'all');
          const next = withoutAll.includes(mode)
            ? withoutAll.filter((f) => f !== mode)
            : [...withoutAll, mode];
          return {
            preferences: {
              ...s.preferences,
              transitFilters: next.length === 0 ? ['all'] : next,
            },
          };
        }),
      setHighContrast: (on) =>
        set((s) => ({ preferences: { ...s.preferences, highContrast: on } })),
      setOfflineMode: (on) =>
        set((s) => ({ preferences: { ...s.preferences, offlineMode: on } })),
      setNotifications: (on) => {
        set((s) => ({
          notificationsEnabled: on,
          preferences: { ...s.preferences, notifications: on },
        }));
      },
      setPrayerTimeAlerts: (on) =>
        set((s) => ({ preferences: { ...s.preferences, prayerTimeAlerts: on } })),
      setRamadanMode: (on) =>
        set((s) => ({ preferences: { ...s.preferences, ramadanMode: on } })),

      // ─── Location ────────────────────────────────────────────────
      setUserLocation: (coords) => set({ userLocation: coords }),
      setLocationPermission: (status) => set({ locationPermission: status }),

      // ─── Notifications ───────────────────────────────────────────
      toggleNotifications: () =>
        set((s) => ({
          notificationsEnabled: !s.notificationsEnabled,
          preferences: { ...s.preferences, notifications: !s.notificationsEnabled },
        })),

      // ─── Sync ────────────────────────────────────────────────────
      setLastSyncTimestamp: (ts) => set({ lastSyncTimestamp: ts }),

      // ─── Reset ───────────────────────────────────────────────────
      resetState: () => set({ ...DEFAULT_STATE }),

      // ─── Map ─────────────────────────────────────────────────────
      setMapView: (center, zoom) => set({ mapCenter: center, mapZoom: zoom }),
      setActiveTrip: (trip) =>
        set((s) => ({ activeTrip: { ...s.activeTrip, ...trip } })),
      clearActiveTrip: () =>
        set({
          activeTrip: {
            tripId: null,
            routeId: null,
            vehicleId: null,
            currentStopIndex: 0,
            nextStopName: null,
            etaMinutes: null,
          },
        }),

      // ─── Connectivity ────────────────────────────────────────────
      setOnline: (online) => set({ isOnline: online }),

      // ─── Alerts ──────────────────────────────────────────────────
      addAlert: (alert) =>
        set((s) => ({
          alerts: [alert, ...s.alerts].slice(0, 50),
          unreadAlertCount: s.unreadAlertCount + 1,
        })),
      markAlertRead: (alertId) =>
        set((s) => ({
          alerts: s.alerts.map((a) => (a.id === alertId ? { ...a, isRead: true } : a)),
          unreadAlertCount: Math.max(0, s.unreadAlertCount - 1),
        })),
      clearAlerts: () => set({ alerts: [], unreadAlertCount: 0 }),

      // ─── Community Reports ───────────────────────────────────────
      incrementReports: () =>
        set((s) => {
          const newCount = s.communityReports + 1;
          return {
            communityReports: newCount,
            trustedContributor: newCount >= 50,
          };
        }),

      // ─── Calendar ────────────────────────────────────────────────
      setCalendarState: (friday, ramadan) =>
        set({ isFriday: friday, isRamadan: ramadan }),
    }),
    {
      name: 'droob-app-store-persist',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        isOnboarded: state.isOnboarded,
        onboardingComplete: state.onboardingComplete,
        language: state.language,
        theme: state.theme,
        preferences: state.preferences,
        isAuthenticated: state.isAuthenticated,
        userId: state.userId,
        phoneNumber: state.phoneNumber,
        displayName: state.displayName,
        locationPermission: state.locationPermission,
        notificationsEnabled: state.notificationsEnabled,
        mapCenter: state.mapCenter,
        mapZoom: state.mapZoom,
        communityReports: state.communityReports,
        trustedContributor: state.trustedContributor,
      }),
    }
  )
);

// ─── Selectors (optimized) ────────────────────────────────────────
export const useOnboardingComplete = () =>
  useAppStore((s) => s.isOnboarded);

export const useIsAuthenticated = () =>
  useAppStore((s) => s.isAuthenticated);

export const useUserPreferences = () =>
  useAppStore((s) => s.preferences);

export const useMapState = () =>
  useAppStore((s) => ({ center: s.mapCenter, zoom: s.mapZoom }));

export const useActiveTrip = () =>
  useAppStore((s) => s.activeTrip);

export const useAlerts = () =>
  useAppStore((s) => ({ alerts: s.alerts, unreadCount: s.unreadAlertCount }));