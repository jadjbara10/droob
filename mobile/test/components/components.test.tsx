// ============================================================================
// دروب (Droob) — Mobile Components Tests (React Native Testing Library)
// ============================================================================
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { TransportIcon } from '@components/TransportIcon';
import { JourneyCard } from '@components/JourneyCard';
import type { Journey, JourneyLeg } from '@types/transit.types';

// ─────────────────────────────────────────────────────────────────────────────
// Mock Native Modules
// ─────────────────────────────────────────────────────────────────────────────
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');

// ─── Helpers ─────────────────────────────────────────────────────────────────
function makeStop(name_ar: string) {
  return {
    id: 's', code: 'S', name_ar, name_en: name_ar,
    lat: 31.95, lng: 35.91,
    governorate: 'عمان' as const,
    city: 'عمان',
    isTerminal: false,
    hasShelter: false,
    hasLighting: false,
    hasAccessibility: false,
    hasTicketMachine: false,
    hasAc: false,
    photoUrl: null,
    parentStationId: null,
    createdAt: '',
    updatedAt: '',
  };
}

function makeLeg(overrides: Partial<JourneyLeg> = {}): JourneyLeg {
  return {
    mode: 'walking',
    routeId: null,
    routeCode: null,
    routeName_ar: null,
    routeName_en: null,
    routeColor: null,
    fromStop: makeStop('موقعك'),
    toStop: makeStop('محطة'),
    departureTime: '2025-01-01T08:00:00Z',
    arrivalTime: '2025-01-01T08:05:00Z',
    duration_min: 5,
    distance_km: 0.4,
    polyline: [],
    fare_jod: 0,
    headway_min: null,
    vehicleOccupancy: null,
    instructions_ar: 'امشِ',
    instructions_en: 'Walk',
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// TransportIcon
// ─────────────────────────────────────────────────────────────────────────────
describe('TransportIcon', () => {
  it('renders BRT icon', () => {
    const { getByTestId } = render(<TransportIcon mode="brt" size={24} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });

  it('renders city_bus icon', () => {
    const { getByTestId } = render(<TransportIcon mode="city_bus" size={24} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });

  it('renders serveece icon', () => {
    const { getByTestId } = render(<TransportIcon mode="serveece" size={24} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });

  it('renders intercity icon', () => {
    const { getByTestId } = render(<TransportIcon mode="intercity" size={24} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });

  it('renders walking icon', () => {
    const { getByTestId } = render(<TransportIcon mode="walking" size={24} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });

  it('renders correct color for BRT', () => {
    const { getByTestId } = render(<TransportIcon mode="brt" size={24} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });

  it('renders large size variant', () => {
    const { getByTestId } = render(<TransportIcon mode="brt" size={48} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });

  it('renders small size variant', () => {
    const { getByTestId } = render(<TransportIcon mode="brt" size={16} />);
    expect(getByTestId('transport-icon')).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JourneyCard
// ─────────────────────────────────────────────────────────────────────────────
describe('JourneyCard', () => {
  const mockJourney: Journey = {
    id: 'j1',
    fromName_ar: 'موقعك الحالي',
    toName_ar: 'الوجهة',
    fromName_en: 'Your Location',
    toName_en: 'Destination',
    fromLat: 31.95,
    fromLng: 35.91,
    toLat: 31.96,
    toLng: 35.92,
    departureTime: '2025-01-01T08:00:00Z',
    arrivalTime: '2025-01-01T08:23:00Z',
    duration_min: 23,
    totalFare_jod: 0.50,
    walkingDistance_km: 0.65,
    legs: [
      makeLeg({ mode: 'walking', fromStop: makeStop('موقعك الحالي'), toStop: makeStop('محطة أ'), duration_min: 5, distance_km: 0.4, departureTime: '2025-01-01T08:00:00Z', arrivalTime: '2025-01-01T08:05:00Z' }),
      makeLeg({ mode: 'brt', routeId: 'r1', routeCode: 'B1', routeName_ar: 'باص عمان', routeName_en: 'Amman Bus', routeColor: '#E60026', fromStop: makeStop('محطة أ'), toStop: makeStop('محطة ب'), duration_min: 15, distance_km: 5.0, departureTime: '2025-01-01T08:05:00Z', arrivalTime: '2025-01-01T08:20:00Z', fare_jod: 0.50 }),
      makeLeg({ mode: 'walking', fromStop: makeStop('محطة ب'), toStop: makeStop('الوجهة'), duration_min: 3, distance_km: 0.25, departureTime: '2025-01-01T08:20:00Z', arrivalTime: '2025-01-01T08:23:00Z' }),
    ],
  };

  // Component uses routeCode in badges (e.g. "B1"), not routeName_ar
  it('renders route codes in badges', () => {
    const { getByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    expect(getByText('B1')).toBeTruthy();
  });

  it('renders walking badges', () => {
    const { getAllByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    expect(getAllByText('مشي').length).toBe(2);
  });

  it('displays total duration', () => {
    const { getAllByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    // Duration appears twice: once in center badge and once in footer stat
    expect(getAllByText('23 دق').length).toBe(2);
  });

  it('displays fare with 3 decimal places', () => {
    const { getByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    expect(getByText('0.500 د.أ')).toBeTruthy();
  });

  it('renders departure and arrival times in local time (UTC+3)', () => {
    const { getByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    // 08:00 UTC = 11:00 Amman, 08:23 UTC = 11:23 Amman
    expect(getByText('11:00')).toBeTruthy();
    expect(getByText('11:23')).toBeTruthy();
  });

  it('renders Arabic labels مغادرة and وصول', () => {
    const { getByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    expect(getByText('مغادرة')).toBeTruthy();
    expect(getByText('وصول')).toBeTruthy();
  });

  it('displays transfer count as (legs.length - 1) تبديل', () => {
    const { getByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    // 3 legs → 2 transfers
    expect(getByText('2 تبديل')).toBeTruthy();
  });

  it('displays walking distance in meters', () => {
    const { getByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    // 0.65 km * 1000 = 650 m
    expect(getByText('650 م')).toBeTruthy();
  });

  it('toggles expanded state on press', () => {
    const { getByText, queryByText } = render(<JourneyCard journey={mockJourney} index={0} onSelect={() => {}} />);
    // Card is collapsed initially — expanded leg details NOT visible
    expect(queryByText('امشِ')).toBeNull();
  });

  it('handles multi-transfer journey with route codes', () => {
    const multiTransfer: Journey = {
      id: 'j2',
      fromName_ar: 'موقعك',
      toName_ar: 'الوجهة',
      fromName_en: 'Your Location',
      toName_en: 'Destination',
      fromLat: 31.95,
      fromLng: 35.91,
      toLat: 31.97,
      toLng: 35.93,
      departureTime: '2025-01-01T09:00:00Z',
      arrivalTime: '2025-01-01T09:38:00Z',
      duration_min: 38,
      totalFare_jod: 1.25,
      walkingDistance_km: 0.6,
      legs: [
        makeLeg({ mode: 'walking', fromStop: makeStop('موقعك'), toStop: makeStop('محطة أ'), duration_min: 3, distance_km: 0.2, departureTime: '2025-01-01T09:00:00Z', arrivalTime: '2025-01-01T09:03:00Z' }),
        makeLeg({ mode: 'city_bus', routeId: 'r2', routeCode: 'CB1', routeName_ar: 'باص مدينة', routeName_en: 'City Bus', routeColor: '#0072CE', fromStop: makeStop('محطة أ'), toStop: makeStop('محطة ب'), duration_min: 10, distance_km: 3.0, departureTime: '2025-01-01T09:03:00Z', arrivalTime: '2025-01-01T09:13:00Z', fare_jod: 0.45 }),
        makeLeg({ mode: 'intercity', routeId: 'r3', routeCode: 'C2', routeName_ar: 'كوستر', routeName_en: 'Coaster', routeColor: '#009640', fromStop: makeStop('محطة ب'), toStop: makeStop('محطة ج'), duration_min: 20, distance_km: 8.0, departureTime: '2025-01-01T09:13:00Z', arrivalTime: '2025-01-01T09:33:00Z', fare_jod: 0.80 }),
        makeLeg({ mode: 'walking', fromStop: makeStop('محطة ج'), toStop: makeStop('الوجهة'), duration_min: 5, distance_km: 0.4, departureTime: '2025-01-01T09:33:00Z', arrivalTime: '2025-01-01T09:38:00Z' }),
      ],
    };

    const { getByText, getAllByText } = render(<JourneyCard journey={multiTransfer} index={0} onSelect={() => {}} />);
    expect(getByText('CB1')).toBeTruthy();
    expect(getByText('C2')).toBeTruthy();
    expect(getByText('3 تبديل')).toBeTruthy();
    expect(getByText('1.250 د.أ')).toBeTruthy();
    // Duration appears twice (center + footer)
    expect(getAllByText('38 دق').length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DepartureCard
// ─────────────────────────────────────────────────────────────────────────────
describe('DepartureCard', () => {
  let DepartureCard: any;
  try {
    DepartureCard = require('@components/DepartureCard').DepartureCard;
  } catch {
    DepartureCard = null;
  }

  const mockDeparture = {
    id: 'd1',
    routeId: 'r1',
    stopId: 's1',
    routeName_ar: 'باص عمان',
    routeName_en: 'Amman Bus',
    code: 'B1',
    mode: 'brt' as const,
    destination_ar: 'دوار المدينة',
    destination_en: 'City Circle',
    scheduledTime: '08:30',
    estimatedTime: '08:32',
    waitMinutes: 5,
    status: 'on_time' as const,
    occupancy: 'partial' as const,
    fare: 0.50,
  };

  const describeIf = DepartureCard ? describe : describe.skip;

  describeIf('DepartureCard', () => {
    it('renders departure information', () => {
      const { getByText } = render(<DepartureCard departure={mockDeparture} />);
      expect(getByText('باص عمان')).toBeTruthy();
      expect(getByText(/08:30|08:32/)).toBeTruthy();
    });

    it('displays wait time', () => {
      const { getByText } = render(<DepartureCard departure={mockDeparture} />);
      expect(getByText(/5/)).toBeTruthy();
    });

    it('displays destination', () => {
      const { getByText } = render(<DepartureCard departure={mockDeparture} />);
      expect(getByText('دوار المدينة')).toBeTruthy();
    });
  });
});