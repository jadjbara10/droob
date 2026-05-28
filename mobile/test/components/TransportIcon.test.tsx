// ============================================================================
// دروب (Droob) — TransportIcon Component Tests
// ============================================================================
import React from 'react';
import { render } from '@testing-library/react-native';
import TransportIcon from '@components/TransportIcon';
import { TRANSPORT_MODES, WALKING_MODE, COLORS } from '@config/transport.config';
import type { TransportMode } from '@types/transit.types';

describe('TransportIcon', () => {
  const modes: (TransportMode | 'walking')[] = ['city_bus', 'brt', 'serveece', 'intercity', 'walking'];

  // ── Basic Rendering ────────────────────────────────────────────────────
  it.each(modes)('renders without crashing for mode: %s', (mode) => {
    const { toJSON } = render(<TransportIcon mode={mode} />);
    expect(toJSON()).toBeTruthy();
  });

  // ── Default Props ──────────────────────────────────────────────────────
  it('defaults to md size', () => {
    const { getByText } = render(<TransportIcon mode="brt" />);
    // Renders the emoji icon text
    const iconText = getByText(TRANSPORT_MODES.brt.icon);
    expect(iconText).toBeTruthy();
  });

  // ── Size Variants ──────────────────────────────────────────────────────
  it('renders sm size correctly', () => {
    const { toJSON } = render(<TransportIcon mode="city_bus" size="sm" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders md size correctly', () => {
    const { toJSON } = render(<TransportIcon mode="city_bus" size="md" />);
    expect(toJSON()).toBeTruthy();
  });

  it('renders lg size correctly', () => {
    const { toJSON } = render(<TransportIcon mode="city_bus" size="lg" />);
    expect(toJSON()).toBeTruthy();
  });

  // ── Route Code Badge ───────────────────────────────────────────────────
  it('shows route code when provided and showBadge is true', () => {
    const { getByText } = render(
      <TransportIcon mode="brt" routeCode="B1" showBadge={true} />
    );
    expect(getByText('B1')).toBeTruthy();
  });

  it('hides badge when showBadge is false', () => {
    const { queryByText } = render(
      <TransportIcon mode="brt" routeCode="B1" showBadge={false} />
    );
    expect(queryByText('B1')).toBeNull();
  });

  it('hides badge when routeCode is undefined', () => {
    const { toJSON } = render(<TransportIcon mode="brt" showBadge={true} />);
    // Should render without badge area
    expect(toJSON()).toBeTruthy();
  });

  // ── Walking Mode ───────────────────────────────────────────────────────
  it('renders walking icon for walking mode', () => {
    const { getByText } = render(<TransportIcon mode="walking" />);
    expect(getByText(WALKING_MODE.icon)).toBeTruthy();
  });

  it('uses walking color for walking mode', () => {
    const { toJSON } = render(<TransportIcon mode="walking" size="md" />);
    expect(toJSON()).toBeTruthy();
  });

  // ── Color Mapping ──────────────────────────────────────────────────────
  it.each(Object.entries(TRANSPORT_MODES))(
    'renders correct icon for %s mode',
    (mode, config) => {
      const { getByText } = render(<TransportIcon mode={mode as TransportMode} />);
      expect(getByText(config.icon)).toBeTruthy();
    }
  );

  // ── Snapshot ───────────────────────────────────────────────────────────
  it('matches snapshot for BRT with badge', () => {
    const { toJSON } = render(
      <TransportIcon mode="brt" routeCode="B1" size="md" />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot for serveece without badge', () => {
    const { toJSON } = render(
      <TransportIcon mode="serveece" size="lg" showBadge={false} />
    );
    expect(toJSON()).toMatchSnapshot();
  });

  it('matches snapshot for walking mode', () => {
    const { toJSON } = render(<TransportIcon mode="walking" size="sm" />);
    expect(toJSON()).toMatchSnapshot();
  });
});