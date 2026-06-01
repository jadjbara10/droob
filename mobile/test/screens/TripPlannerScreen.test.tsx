// ============================================================================
// دروب (Droob) — TripPlannerScreen Tests
// Journey planning: origin/destination fields, time/mode filters, results
// ============================================================================
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import TripPlannerScreen from '@screens/TripPlannerScreen';

// ─────────────────────────────────────────────────────────────────────────────
// Mocks — factories must use require() internally
// ─────────────────────────────────────────────────────────────────────────────

// ─── react-native-safe-area-context ─────────────────────────────────────────
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
  SafeAreaProvider: ({ children }: any) => children,
  SafeAreaView: ({ children }: any) => children,
}));

// ─── @react-navigation/native ───────────────────────────────────────────────
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn() }),
}));

// ─── Transit Store (Zustand) ──────────────────────────────────────────────
let mockStoreState: any = {};

jest.mock('@stores/transit.store', () => ({
  useTransitStore: (selector: any) => {
    const s = (globalThis as any).mockStoreState || {};
    const state = {
      journeys: [],
      planJourney: jest.fn(),
      error: null,
      isLoading: false,
      ...s,
    };
    return selector ? selector(state) : state;
  },
}));

// ─── Components with heavy deps ───────────────────────────────────────────
jest.mock('@components/JourneyCard', () => {
  const r = require('react');
  const { View, Text } = require('react-native');
  const JourneyCard = ({ journey }: any) =>
    r.createElement(View, { testID: 'journey-card', key: journey.id },
      r.createElement(Text, null, journey.id ?? 'journey-card-mock'));
  JourneyCard.displayName = 'JourneyCard';
  return { __esModule: true, default: JourneyCard, JourneyCard };
});

jest.mock('@components/TransitBadge', () => {
  const r = require('react');
  const { View, Text } = require('react-native');
  const Comp = ({ mode }: any) =>
    r.createElement(View, { testID: 'transit-badge-mock' }, r.createElement(Text, null, `badge-${mode}`));
  return { __esModule: true, default: Comp, TransitBadge: Comp };
});

jest.mock('@components/ErrorBoundary', () => ({
  __esModule: true,
  ErrorBoundary: ({ children }: any) => children,
  default: ({ children }: any) => children,
}));

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────
describe('TripPlannerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (globalThis as any).mockStoreState = {};
  });

  // ─── Rendering ───────────────────────────────────────────────────────────
  it('renders without crashing', () => {
    const { unmount } = render(<TripPlannerScreen />);
    unmount();
  });

  // ─── Header ──────────────────────────────────────────────────────────────
  it('displays the screen title', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('تخطيط الرحلة')).toBeTruthy();
    unmount();
  });

  // ─── Location Fields ─────────────────────────────────────────────────────
  it('renders the origin (من أين؟) field', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('من أين؟')).toBeTruthy();
    unmount();
  });

  it('renders the destination (إلى أين؟) field', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('إلى أين؟')).toBeTruthy();
    unmount();
  });

  it('shows placeholder text in origin field initially', () => {
    const { getAllByText, unmount } = render(<TripPlannerScreen />);
    // "موقعي الحالي" appears as the origin placeholder text
    expect(getAllByText('موقعي الحالي').length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it('shows placeholder text in destination field initially', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('اختر الوجهة')).toBeTruthy();
    unmount();
  });

  // ─── Swap Button ─────────────────────────────────────────────────────────
  it('renders the swap button with icon and accessibility label', () => {
    const { getByText, getByLabelText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('⇅')).toBeTruthy();
    expect(getByLabelText('تبديل الوجهة ونقطة الانطلاق')).toBeTruthy();
    unmount();
  });

  // ─── Time Selector ───────────────────────────────────────────────────────
  it('renders the time selector pills', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('الآن')).toBeTruthy();
    expect(getByText('أغادر في')).toBeTruthy();
    expect(getByText('أصل في')).toBeTruthy();
    unmount();
  });

  // ─── Preference Tabs ─────────────────────────────────────────────────────
  it('renders preference filter tabs', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('الأسرع')).toBeTruthy();
    expect(getByText('أقل تحويلات')).toBeTruthy();
    expect(getByText('أقل مشي')).toBeTruthy();
    expect(getByText('مناسب للإعاقة')).toBeTruthy();
    expect(getByText('الأرخص')).toBeTruthy();
    unmount();
  });

  // ─── Mode Filter Chips ─────────────────────────────────────────────────────
  it('renders mode filter chips', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('الكل')).toBeTruthy();
    expect(getByText('باص')).toBeTruthy();
    expect(getByText('BRT')).toBeTruthy();
    expect(getByText('سرفيس')).toBeTruthy();
    expect(getByText('خطوط')).toBeTruthy();
    unmount();
  });

  // ─── Empty / Idle State ──────────────────────────────────────────────────
  it('shows idle state when no origin or destination is set', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);
    expect(getByText('أين تريد الذهاب؟')).toBeTruthy();
    expect(getByText('أدخل وجهتك للبحث عن أفضل الرحلات المتاحة.')).toBeTruthy();
    unmount();
  });

  // ─── Journey Results ─────────────────────────────────────────────────────
  it('renders journey results when origin is set', () => {
    const { getByLabelText, getAllByText, getAllByTestId, unmount } = render(<TripPlannerScreen />);

    // Open the from field search
    const fromField = getByLabelText('نقطة الانطلاق: غير محدد');
    fireEvent.press(fromField);

    // Select "موقعي الحالي" in the search sheet (it's the current location button)
    const currentLocOptions = getAllByText('موقعي الحالي');
    // The one inside the search sheet is the button
    fireEvent.press(currentLocOptions[currentLocOptions.length - 1]);

    // Now fromLabel = "موقعي الحالي", which triggers display of MOCK_JOURNEYS
    expect(getAllByText('3 رحلة متاحة').length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  it('renders journey cards via the FlatList', () => {
    const { getByLabelText, getAllByText, getAllByTestId, unmount } = render(<TripPlannerScreen />);

    const fromField = getByLabelText('نقطة الانطلاق: غير محدد');
    fireEvent.press(fromField);
    const currentLocOptions = getAllByText('موقعي الحالي');
    fireEvent.press(currentLocOptions[currentLocOptions.length - 1]);

    const cards = getAllByTestId('journey-card');
    expect(cards.length).toBe(3);
    unmount();
  });

  // ─── Search Sheet ────────────────────────────────────────────────────────
  it('opens search sheet when origin field is pressed', () => {
    const { getByLabelText, getByPlaceholderText, unmount } = render(<TripPlannerScreen />);

    const fromField = getByLabelText('نقطة الانطلاق: غير محدد');
    fireEvent.press(fromField);

    expect(getByPlaceholderText('ابحث عن محطة انطلاق...')).toBeTruthy();
    unmount();
  });

  it('opens search sheet when destination field is pressed', () => {
    const { getByLabelText, getByPlaceholderText, unmount } = render(<TripPlannerScreen />);

    const toField = getByLabelText('الوجهة: غير محدد');
    fireEvent.press(toField);

    expect(getByPlaceholderText('ابحث عن وجهة...')).toBeTruthy();
    unmount();
  });

  it('search sheet displays quick stops list', () => {
    const { getByLabelText, getByText, getAllByText, unmount } = render(<TripPlannerScreen />);

    const fromField = getByLabelText('نقطة الانطلاق: غير محدد');
    fireEvent.press(fromField);

    expect(getByText('محطات سريعة')).toBeTruthy();
    // Use getAllByText since these stops also appear in other contexts
    const abdali = getAllByText('العبدلي');
    expect(abdali.length).toBeGreaterThanOrEqual(1);
    unmount();
  });

  // ─── Back Button ─────────────────────────────────────────────────────────
  it('renders a back button', () => {
    const { getByLabelText, unmount } = render(<TripPlannerScreen />);
    expect(getByLabelText('رجوع')).toBeTruthy();
    unmount();
  });

  // ─── Mode Filter Toggle ──────────────────────────────────────────────────
  it('allows toggling mode chips', () => {
    const { getByText, unmount } = render(<TripPlannerScreen />);

    const brtChip = getByText('BRT');
    fireEvent.press(brtChip);

    // Component doesn't crash after toggle
    expect(getByText('BRT')).toBeTruthy();
    unmount();
  });

  // ─── Empty State ─────────────────────────────────────────────────────────
  it('shows idle state initially and results after setting origin', () => {
    const { getByLabelText, getByText, getAllByText, queryByText, unmount } = render(<TripPlannerScreen />);

    // Initially idle state is shown
    expect(getByText('أين تريد الذهاب؟')).toBeTruthy();

    // Set origin by opening search and selecting current location
    const fromField = getByLabelText('نقطة الانطلاق: غير محدد');
    fireEvent.press(fromField);
    const currentLocOptions = getAllByText('موقعي الحالي');
    fireEvent.press(currentLocOptions[currentLocOptions.length - 1]);

    // Results appear
    expect(getAllByText('3 رحلة متاحة').length).toBeGreaterThanOrEqual(1);
    // Idle state should be gone
    expect(queryByText('أين تريد الذهاب؟')).toBeNull();
    unmount();
  });
});
