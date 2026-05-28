// ============================================================================
// دروب (Droob) — Transport Config Snapshot Tests
// Ensures config constants never change unexpectedly
// ============================================================================
import {
  JORDAN_BOUNDS,
  AMMAN_CENTER,
  DEFAULT_ZOOM,
  MIN_ZOOM,
  MAX_ZOOM,
  TRANSPORT_MODES,
  WALKING_MODE,
  COLORS,
  OCCUPANCY,
  DEPARTURE_STATUS,
  GOVERNORATES,
} from '@config/transport.config';

describe('Config Snapshots', () => {
  it('JORDAN_BOUNDS snapshot', () => {
    expect(JORDAN_BOUNDS).toMatchSnapshot();
  });

  it('AMMAN_CENTER snapshot', () => {
    expect(AMMAN_CENTER).toMatchSnapshot();
  });

  it('zoom levels snapshot', () => {
    expect({ DEFAULT_ZOOM, MIN_ZOOM, MAX_ZOOM }).toMatchSnapshot();
  });

  it('TRANSPORT_MODES snapshot', () => {
    const serialized = Object.fromEntries(
      Object.entries(TRANSPORT_MODES).map(([k, v]) => [k, v])
    );
    expect(serialized).toMatchSnapshot();
  });

  it('WALKING_MODE snapshot', () => {
    expect(WALKING_MODE).toMatchSnapshot();
  });

  it('COLORS snapshot', () => {
    expect(COLORS).toMatchSnapshot();
  });

  it('OCCUPANCY snapshot', () => {
    expect(OCCUPANCY).toMatchSnapshot();
  });

  it('DEPARTURE_STATUS snapshot', () => {
    expect(DEPARTURE_STATUS).toMatchSnapshot();
  });

  it('GOVERNORATES snapshot', () => {
    expect(GOVERNORATES).toMatchSnapshot();
  });
});