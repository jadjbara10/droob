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
// NOTE: Do NOT mock react-native/Libraries/Animated/Animated here.
// The real Animated module works in tests with just NativeAnimatedHelper
// mocked. Mocking it breaks @testing-library/react-native's host component
// detection and TouchableOpacity's internal usage of Animated.Value.
jest.mock('react-native/Libraries/Animated/AnimatedEvent', () => {
  // Must be a class (not an object) — used in `instanceof` checks
  class AnimatedEvent {}
  return { __esModule: true, default: AnimatedEvent, AnimatedEvent };
});

// ─── Mock react-native-worklets to prevent reanimated crashes ────────────
jest.mock('react-native-worklets', () => {
  const noop = (..._args: any[]) => {};
  const id = <T>(x: T) => x;
  return {
    __esModule: true,
    // Deprecated
    isShareableRef: () => false,
    makeShareable: id,
    makeShareableCloneOnUIRecursive: id,
    makeShareableCloneRecursive: id,
    shareableMappingCache: { get: () => undefined, set: noop },
    // Feature flags
    getDynamicFeatureFlag: () => false,
    getStaticFeatureFlag: () => false,
    setDynamicFeatureFlag: noop,
    // Memory
    isSynchronizable: () => false,
    createSerializable: <T>(obj: T) => obj,
    isSerializableRef: () => false,
    registerCustomSerializable: noop,
    serializableMappingCache: { get: () => undefined, set: noop },
    createSynchronizable: (obj: any) => ({ __isSynchronizable: true, ...obj }),
    // Runtime
    getRuntimeKind: () => 'unknown',
    RuntimeKind: { UNKNOWN: 0 },
    createWorkletRuntime: noop,
    runOnRuntime: noop,
    scheduleOnRuntime: noop,
    // Threads
    callMicrotasks: noop,
    executeOnUIRuntimeSync: id,
    runOnJS: id,
    runOnUI: id,
    runOnUIAsync: id,
    runOnUISync: id,
    scheduleOnRN: noop,
    scheduleOnUI: noop,
    unstable_eventLoopTask: noop,
    // Types
    isWorkletFunction: () => false,
    // Module (crash point in tests — must be a noop object)
    WorkletsModule: { createWorkletRuntime: noop, scheduleOnUI: noop },
    // Default
    default: { runOnJS: id, runOnUI: id },
  };
});

// ─── react-native-reanimated mock (chainable animation builders) ───────────
jest.mock('react-native-reanimated', () => {
  const { View, Text, ScrollView } = require('react-native');
  const animBuilder = () => ({
    duration: () => animBuilder(),
    springify: () => animBuilder(),
    delay: () => animBuilder(),
    mass: () => animBuilder(),
    stiffness: () => animBuilder(),
    damping: () => animBuilder(),
    easing: () => animBuilder(),
    withCallback: () => animBuilder(),
    randomDelay: () => animBuilder(),
    withInitialValues: () => animBuilder(),
    build: () => () => ({ initialValues: {}, animations: {} }),
  });
  const Animated = { View, Text, ScrollView };
  return {
    __esModule: true,
    default: { View, Text, createAnimatedComponent: (C: any) => C, ...Animated },
    useSharedValue: (init: any) => ({ value: init }),
    useAnimatedStyle: (style: any) => (typeof style === 'function' ? style() : style),
    useAnimatedProps: (style: any) => (typeof style === 'function' ? style() : style),
    useDerivedValue: (fn: any) => ({ value: fn() }),
    useAnimatedRef: () => ({ current: null }),
    useAnimatedScrollHandler: () => ({ onScroll: () => {} }),
    useAnimatedReaction: () => {},
    useAnimatedSensor: () => ({ sensor: { value: {} }, unregister: () => {} }),
    useAnimatedKeyboard: () => ({ height: 0, state: 0 }),
    useAnimatedGestureHandler: () => ({}),
    withSpring: (val: any) => val,
    withTiming: (val: any) => val,
    withRepeat: (val: any) => val,
    withSequence: (...vals: any[]) => vals[vals.length - 1],
    withDelay: (_ms: number, next: any) => next,
    withDecay: (val: any) => val,
    cancelAnimation: () => {},
    interpolate: (_v: any, _i: any[], o: any[]) => o[0],
    Extrapolation: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend', IDENTITY: 'identity' },
    runOnJS: (fn: any) => fn,
    runOnUI: (fn: any) => fn,
    createAnimatedComponent: (C: any) => C,
    measure: () => ({ x: 0, y: 0, width: 0, height: 0, pageX: 0, pageY: 0 }),
    scrollTo: () => {},
    setNativeProps: () => {},
    enableLayoutAnimations: () => {},
    layoutAnimationManager: { enable: () => {} },
    reduceMotion: { current: 'never' },
    isReanimated3: () => false,
    FadeIn: animBuilder(),
    FadeOut: animBuilder(),
    FadeInDown: animBuilder(),
    FadeInUp: animBuilder(),
    FadeInLeft: animBuilder(),
    FadeInRight: animBuilder(),
    FadeOutDown: animBuilder(),
    FadeOutUp: animBuilder(),
    FadeOutLeft: animBuilder(),
    FadeOutRight: animBuilder(),
    SlideInDown: animBuilder(),
    SlideInUp: animBuilder(),
    SlideInLeft: animBuilder(),
    SlideInRight: animBuilder(),
    SlideOutDown: animBuilder(),
    SlideOutUp: animBuilder(),
    SlideOutLeft: animBuilder(),
    SlideOutRight: animBuilder(),
    ZoomIn: animBuilder(),
    ZoomOut: animBuilder(),
    BounceIn: animBuilder(),
    BounceOut: animBuilder(),
    LightSpeedInRight: animBuilder(),
    LightSpeedOutRight: animBuilder(),
    PinwheelIn: animBuilder(),
    PinwheelOut: animBuilder(),
    RotateInDownLeft: animBuilder(),
    RotateOutDownLeft: animBuilder(),
    RollInLeft: animBuilder(),
    RollOutRight: animBuilder(),
    FlipInXUp: animBuilder(),
    FlipOutXDown: animBuilder(),
    StretchInX: animBuilder(),
    StretchOutX: animBuilder(),
    Layout: animBuilder(),
    LinearTransition: animBuilder(),
    FadingTransition: animBuilder(),
    SequencedTransition: animBuilder(),
    JumpingTransition: animBuilder(),
    CurvedTransition: animBuilder(),
    EntryExitTransition: animBuilder(),
    BaseAnimationBuilder: { build: () => () => {} },
    ComplexAnimationBuilder: { build: () => () => {} },
    Keyframe: animBuilder(),
    Animated,
  };
});

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

// ─── Mock @expo/vector-icons (must be React components, not strings) ──────
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { View, Text } = require('react-native');
  const makeIcon = () => {
    const Icon = (props: any) =>
      React.createElement(View, null, React.createElement(Text, null, props.name || 'icon'));
    Icon.displayName = 'MockIcon';
    return Icon;
  };
  return {
    MaterialCommunityIcons: makeIcon(),
    Ionicons: makeIcon(),
    MaterialIcons: makeIcon(),
  };
});

// ─── Mock expo-haptics (used by TransitBadge, AlertsScreen etc.) ───────────
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Heavy: 'heavy' },
  notificationAsync: jest.fn(() => Promise.resolve()),
  NotificationFeedbackType: { Success: 'success', Warning: 'warning', Error: 'error' },
  selectionAsync: jest.fn(() => Promise.resolve()),
}));

// ─── Configure RTL host component names (avoid auto-detection crashes) ────
try {
  const { configure } = require('@testing-library/react-native');
  configure({
    hostComponentNames: {
      text: 'Text',
      textInput: 'TextInput',
      image: 'Image',
      switch: 'Switch',
      scrollView: 'ScrollView',
      modal: 'Modal',
    },
  });
} catch (_e) {
  // RTL might not be available yet in setupFiles phase — that's okay
}

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