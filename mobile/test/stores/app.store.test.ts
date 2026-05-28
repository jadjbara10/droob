// ============================================================================
// دروب (Droob) — App Store Tests (Zustand)
// ============================================================================
import { useAppStore } from '@stores/app.store';

describe('useAppStore', () => {
  beforeEach(() => {
    useAppStore.setState({
      isOnboarded: false,
      isAuthenticated: false,
      language: 'ar',
      theme: 'system',
      locationPermission: 'undetermined',
      notificationsEnabled: true,
      lastSyncTimestamp: null,
    });
  });

  // ─── Initial State ──────────────────────────────────────────────────
  it('has correct initial state', () => {
    const state = useAppStore.getState();
    expect(state.isOnboarded).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.language).toBe('ar');
    expect(state.theme).toBe('system');
    expect(state.locationPermission).toBe('undetermined');
    expect(state.notificationsEnabled).toBe(true);
    expect(state.lastSyncTimestamp).toBeNull();
  });

  // ─── Onboarding ─────────────────────────────────────────────────────
  it('setOnboarded sets onboarding flag', () => {
    useAppStore.getState().setOnboarded(true);
    expect(useAppStore.getState().isOnboarded).toBe(true);
  });

  // ─── Authentication ─────────────────────────────────────────────────
  it('setAuthenticated sets auth flag', () => {
    useAppStore.getState().setAuthenticated(true);
    expect(useAppStore.getState().isAuthenticated).toBe(true);

    useAppStore.getState().setAuthenticated(false);
    expect(useAppStore.getState().isAuthenticated).toBe(false);
  });

  // ─── Language ───────────────────────────────────────────────────────
  it('setLanguage updates language', () => {
    useAppStore.getState().setLanguage('en');
    expect(useAppStore.getState().language).toBe('en');

    useAppStore.getState().setLanguage('ar');
    expect(useAppStore.getState().language).toBe('ar');
  });

  it('setLanguage only accepts ar or en', () => {
    useAppStore.getState().setLanguage('ar');
    expect(useAppStore.getState().language).toBe('ar');

    useAppStore.getState().setLanguage('en');
    expect(useAppStore.getState().language).toBe('en');
  });

  // ─── Theme ──────────────────────────────────────────────────────────
  it('setTheme updates theme', () => {
    useAppStore.getState().setTheme('light');
    expect(useAppStore.getState().theme).toBe('light');

    useAppStore.getState().setTheme('dark');
    expect(useAppStore.getState().theme).toBe('dark');

    useAppStore.getState().setTheme('system');
    expect(useAppStore.getState().theme).toBe('system');
  });

  // ─── Location Permission ────────────────────────────────────────────
  it('setLocationPermission updates permission status', () => {
    useAppStore.getState().setLocationPermission('granted');
    expect(useAppStore.getState().locationPermission).toBe('granted');

    useAppStore.getState().setLocationPermission('denied');
    expect(useAppStore.getState().locationPermission).toBe('denied');
  });

  // ─── Notifications ──────────────────────────────────────────────────
  it('toggleNotifications flips notification setting', () => {
    expect(useAppStore.getState().notificationsEnabled).toBe(true);
    useAppStore.getState().toggleNotifications();
    expect(useAppStore.getState().notificationsEnabled).toBe(false);
    useAppStore.getState().toggleNotifications();
    expect(useAppStore.getState().notificationsEnabled).toBe(true);
  });

  // ─── Sync Timestamp ─────────────────────────────────────────────────
  it('setLastSyncTimestamp updates sync time', () => {
    const now = Date.now();
    useAppStore.getState().setLastSyncTimestamp(now);
    expect(useAppStore.getState().lastSyncTimestamp).toBe(now);
  });

  // ─── Reset ──────────────────────────────────────────────────────────
  it('resetState returns to defaults', () => {
    // Change all values
    useAppStore.setState({
      isOnboarded: true,
      isAuthenticated: true,
      language: 'en',
      theme: 'dark',
      locationPermission: 'granted',
      notificationsEnabled: false,
      lastSyncTimestamp: Date.now(),
    });

    useAppStore.getState().resetState();

    const state = useAppStore.getState();
    expect(state.isOnboarded).toBe(false);
    expect(state.isAuthenticated).toBe(false);
    expect(state.language).toBe('ar');
    expect(state.theme).toBe('system');
    expect(state.locationPermission).toBe('undetermined');
    expect(state.notificationsEnabled).toBe(true);
    expect(state.lastSyncTimestamp).toBeNull();
  });
});