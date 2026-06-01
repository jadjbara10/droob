// ============================================================================
// دروب (Droob) — HomeScreen Tests
// Map-centric home with search bar, bottom sheet, quick chips, offline banner
// ============================================================================
import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';
import HomeScreen from '@screens/HomeScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — factories must use require() internally
// NOTE: react-native-reanimated is mocked globally in setup.ts
// ─────────────────────────────────────────────────────────────────────────────

// ─── react-native-safe-area-context ─────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

// ─── react-native-webview (used by LeafletMap) ──────────────────────────────
jest.mock('react-native-webview', () => {
  const View = require('react-native').View;
  const r = require('react');
  const WebView = (props: any) => r.createElement(View, { ...props, testID: 'webview-mock' });
  return { __esModule: true, default: WebView, WebView };
});

// ─── LeafletMap (renders via WebView, mock to avoid HTML rendering) ─────────
jest.mock('@components/LeafletMap', () => {
  const r = require('react');
  const View = require('react-native').View;
  const LeafletMap = r.forwardRef((props: any, _ref: any) =>
    r.createElement(View, { testID: 'leaflet-map-mock', ...props }),
  );
  LeafletMap.displayName = 'LeafletMap';
  return { __esModule: true, default: LeafletMap, LeafletMap };
});

// ─── BottomSheet (uses Gesture Handler, mock for isolation) ────────────────
jest.mock('@components/BottomSheet', () => {
  const r = require('react');
  const View = require('react-native').View;
  const BottomSheet = r.forwardRef(
    (props: any, _ref: any) => r.createElement(View, { testID: 'bottom-sheet-mock' }, props.children),
  );
  BottomSheet.displayName = 'BottomSheet';
  return { __esModule: true, default: BottomSheet, BottomSheet };
});

// ─── ErrorBoundary — just renders children in test environment ──────────────
jest.mock('@components/ErrorBoundary', () => ({
  __esModule: true,
  ErrorBoundary: ({ children }: any) => children,
  default: ({ children }: any) => children,
}));

// ─── TransitBadge — render label for test queries ──────────────────────────
jest.mock('@components/TransitBadge', () => {
  const r = require('react');
  const { View, Text } = require('react-native');
  const Comp = ({ mode }: any) =>
    r.createElement(View, { testID: 'transit-badge-mock' }, r.createElement(Text, null, mode));
  return { __esModule: true, default: Comp, TransitBadge: Comp };
});

// ─── CountdownTimer — simplified display ──────────────────────────────────
jest.mock('@components/CountdownTimer', () => {
  const r = require('react');
  const { View, Text } = require('react-native');
  const Comp = ({ minutes }: any) =>
    r.createElement(View, { testID: 'countdown-timer-mock' }, r.createElement(Text, null, `${Math.round(minutes)} دق`));
  return { __esModule: true, default: Comp, CountdownTimer: Comp };
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('HomeScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  // ─── Rendering ───────────────────────────────────────────────────────────
  it('renders without crashing', () => {
    const { unmount } = render(<HomeScreen />);
    unmount();
  });

  // ─── Search Bar ──────────────────────────────────────────────────────────
  it('shows the search bar with placeholder text', () => {
    const { getByPlaceholderText, unmount } = render(<HomeScreen />);
    expect(getByPlaceholderText('إلى أين؟')).toBeTruthy();
    unmount();
  });

  it('search bar has accessibility label', () => {
    const { getByLabelText, unmount } = render(<HomeScreen />);
    expect(getByLabelText('بحث عن وجهة')).toBeTruthy();
    unmount();
  });

  // ─── Map Component ───────────────────────────────────────────────────────
  it('mounts the map component', () => {
    const { getByTestId, unmount } = render(<HomeScreen />);
    expect(getByTestId('leaflet-map-mock')).toBeTruthy();
    unmount();
  });

  // ─── Bottom Sheet ────────────────────────────────────────────────────────
  it('renders the bottom sheet', () => {
    const { getByTestId, unmount } = render(<HomeScreen />);
    expect(getByTestId('bottom-sheet-mock')).toBeTruthy();
    unmount();
  });

  // ─── Quick Chips ─────────────────────────────────────────────────────────
  it('displays quick destination chips', () => {
    const { getByText, unmount } = render(<HomeScreen />);
    expect(getByText('البيت')).toBeTruthy();
    expect(getByText('العمل')).toBeTruthy();
    expect(getByText('الجامعة')).toBeTruthy();
    expect(getByText('وسط البلد')).toBeTruthy();
    expect(getByText('المطار')).toBeTruthy();
    unmount();
  });

  it('displays the add chip', () => {
    const { getByText, unmount } = render(<HomeScreen />);
    expect(getByText('إضافة')).toBeTruthy();
    unmount();
  });

  it('each quick chip has accessibility label', () => {
    const { getByLabelText, unmount } = render(<HomeScreen />);
    expect(getByLabelText('البيت — Home')).toBeTruthy();
    expect(getByLabelText('العمل — Work')).toBeTruthy();
    unmount();
  });

  // ─── Offline Banner ──────────────────────────────────────────────────────
  it('shows offline banner initially', () => {
    const { getByText, unmount } = render(<HomeScreen />);
    expect(getByText('تم تحميل بيانات غير مباشرة')).toBeTruthy();
    unmount();
  });

  it('hides offline banner after timeout', () => {
    const { queryByText, unmount } = render(<HomeScreen />);
    expect(queryByText('تم تحميل بيانات غير مباشرة')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(5000);
    });
    expect(queryByText('تم تحميل بيانات غير مباشرة')).toBeNull();
    unmount();
  });

  // ─── Tab Navigation ──────────────────────────────────────────────────────
  it('displays both tab labels', () => {
    const { getByText, unmount } = render(<HomeScreen />);
    expect(getByText('قريب مني')).toBeTruthy();
    expect(getByText('محطات')).toBeTruthy();
    unmount();
  });

  // ─── Nearby Stops ────────────────────────────────────────────────────────
  it('displays nearby stops heading', () => {
    const { getByText, unmount } = render(<HomeScreen />);
    expect(getByText('محطات قريبة')).toBeTruthy();
    unmount();
  });

  it('displays nearby stop names', () => {
    const { getByText, unmount } = render(<HomeScreen />);
    expect(getByText('محطة الجاردنز')).toBeTruthy();
    expect(getByText('دوار الواحة')).toBeTruthy();
    unmount();
  });

  // ─── Location FAB ────────────────────────────────────────────────────────
  it('renders the location FAB', () => {
    const { getByLabelText, unmount } = render(<HomeScreen />);
    expect(getByLabelText('موقعي الحالي')).toBeTruthy();
    unmount();
  });

  // ─── Avatar button ────────────────────────────────────────────────────────
  it('renders the profile avatar button', () => {
    const { getByLabelText, unmount } = render(<HomeScreen />);
    expect(getByLabelText('الملف الشخصي')).toBeTruthy();
    unmount();
  });
});
