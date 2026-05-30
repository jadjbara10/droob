// ============================================================================
// دروب (Droob) — Jest Setup
// Global mocks and React Native Testing Library configuration
// ============================================================================
// jest-native extend-expect is not used — it requires expect to be defined in setupFiles

// ─── Mock react-native modules not available in test environment ──────────
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => ({}));
jest.mock('react-native/Libraries/EventEmitter/NativeEventEmitter', () => ({
  default: jest.fn().mockImplementation(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  })),
}));
jest.mock('react-native/Libraries/Animated/Animated', () => ({
  Value: jest.fn(),
  timing: jest.fn(),
  spring: jest.fn(),
}));
jest.mock('react-native/Libraries/Animated/AnimatedEvent', () => ({}));

// ─── Mock react-native-mmkv (used instead of AsyncStorage) ────────────────
jest.mock('react-native-mmkv', () => {
  const mockStorage: Record<string, string> = {};
  return {
    MMKV: jest.fn().mockImplementation(() => ({
      getString: jest.fn((key: string) => mockStorage[key] ?? null),
      set: jest.fn((key: string, value: string) => {
        mockStorage[key] = value;
      }),
      delete: jest.fn((key: string) => {
        delete mockStorage[key];
      }),
      clearAll: jest.fn(() => {
        Object.keys(mockStorage).forEach((k) => delete mockStorage[k]);
      }),
      getAllKeys: jest.fn(() => Object.keys(mockStorage)),
      getNumber: jest.fn((key: string) => (mockStorage[key] ? Number(mockStorage[key]) : null)),
      getBoolean: jest.fn((key: string) => mockStorage[key] === 'true'),
    })),
  };
});

// ─── Mock NetInfo ───────────────────────────────────────────────────────────
jest.mock('@react-native-community/netinfo', () => ({
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
      details: null,
    }),
  ),
  addEventListener: jest.fn(() => jest.fn()),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: null,
  })),
}));

// ─── Mock Expo Modules ──────────────────────────────────────────────────────
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: {
      extra: {
        API_URL: 'http://localhost:3000',
      },
    },
  },
}));

jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' }),
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: { latitude: 31.9539, longitude: 35.9106 },
      timestamp: Date.now(),
    }),
  ),
  Accuracy: { High: 6 },
}));

jest.mock('expo-font', () => ({
  loadAsync: jest.fn(() => Promise.resolve()),
  isLoaded: jest.fn(() => true),
}));

// ─── Mock @expo/vector-icons ──────────────────────────────────────────────
jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
  MaterialIcons: 'MaterialIcons',
}));

// ─── Suppress specific console warnings in tests ────────────────────────────
const originalWarn = console.warn;
console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('ReactDOM.render') ||
      args[0].includes('UNSAFE_'))
  ) {
    return;
  }
  originalWarn(...args);
};