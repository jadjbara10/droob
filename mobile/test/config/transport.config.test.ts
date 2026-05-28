// ============================================================================
// دروب (Droob) — Transport Config Tests
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
  MAPBOX_ARABIC_STYLE,
} from '@config/transport.config';

// =============================================================================
// Jordan Geographic Bounds
// =============================================================================
describe('JORDAN_BOUNDS', () => {
  it('has correct boundary values', () => {
    expect(JORDAN_BOUNDS.west).toBe(35.0);
    expect(JORDAN_BOUNDS.south).toBe(29.0);
    expect(JORDAN_BOUNDS.east).toBe(39.5);
    expect(JORDAN_BOUNDS.north).toBe(33.5);
  });

  it('is a valid bounding box (west < east, south < north)', () => {
    expect(JORDAN_BOUNDS.west).toBeLessThan(JORDAN_BOUNDS.east);
    expect(JORDAN_BOUNDS.south).toBeLessThan(JORDAN_BOUNDS.north);
  });

  it('contains Amman center coordinates', () => {
    expect(AMMAN_CENTER.lat).toBeGreaterThan(JORDAN_BOUNDS.south);
    expect(AMMAN_CENTER.lat).toBeLessThan(JORDAN_BOUNDS.north);
    expect(AMMAN_CENTER.lng).toBeGreaterThan(JORDAN_BOUNDS.west);
    expect(AMMAN_CENTER.lng).toBeLessThan(JORDAN_BOUNDS.east);
  });
});

// =============================================================================
// Amman Center & Zoom
// =============================================================================
describe('AMMAN_CENTER', () => {
  it('is at 4th Circle coordinates', () => {
    expect(AMMAN_CENTER.lat).toBeCloseTo(31.9539, 4);
    expect(AMMAN_CENTER.lng).toBeCloseTo(35.9106, 4);
  });
});

describe('zoom levels', () => {
  it('DEFAULT_ZOOM is between MIN and MAX zoom', () => {
    expect(DEFAULT_ZOOM).toBeGreaterThan(MIN_ZOOM);
    expect(DEFAULT_ZOOM).toBeLessThanOrEqual(MAX_ZOOM);
  });

  it('MIN_ZOOM is >= 1', () => {
    expect(MIN_ZOOM).toBeGreaterThanOrEqual(1);
  });

  it('MAX_ZOOM is reasonable', () => {
    expect(MAX_ZOOM).toBeLessThanOrEqual(22);
  });
});

// =============================================================================
// Transport Modes
// =============================================================================
describe('TRANSPORT_MODES', () => {
  const expectedModes = ['city_bus', 'brt', 'serveece', 'intercity'] as const;

  it('defines all 4 expected transport modes', () => {
    expectedModes.forEach((mode) => {
      expect(TRANSPORT_MODES[mode]).toBeDefined();
    });
    expect(Object.keys(TRANSPORT_MODES)).toHaveLength(4);
  });

  it('every mode has valid config properties', () => {
    Object.values(TRANSPORT_MODES).forEach((config) => {
      expect(config.mode).toBeTruthy();
      expect(config.label_ar).toBeTruthy();
      expect(config.label_en).toBeTruthy();
      expect(config.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(config.icon).toBeTruthy();
      expect(config.speed_kmh).toBeGreaterThan(0);
      expect(config.fare_min_jod).toBeGreaterThan(0);
      expect(config.fare_max_jod).toBeGreaterThanOrEqual(config.fare_min_jod);
      expect(typeof config.is_fixed_schedule).toBe('boolean');
      expect(typeof config.is_frequent_service).toBe('boolean');
      expect(['schedule', 'headway', 'on_demand']).toContain(config.departure_logic);
    });
  });

  it('BRT has red color matching spec', () => {
    expect(TRANSPORT_MODES.brt.color).toBe('#E60026');
  });

  it('city_bus has blue color matching spec', () => {
    expect(TRANSPORT_MODES.city_bus.color).toBe('#0066CC');
  });

  it('serveece has amber color matching spec', () => {
    expect(TRANSPORT_MODES.serveece.color).toBe('#FF8C00');
  });

  it('intercity has purple color matching spec', () => {
    expect(TRANSPORT_MODES.intercity.color).toBe('#6B21A8');
  });

  it('BRT is most expensive city mode', () => {
    const brtFare = TRANSPORT_MODES.brt.fare_min_jod;
    expect(brtFare).toBeGreaterThanOrEqual(TRANSPORT_MODES.city_bus.fare_min_jod);
  });

  it('intercity has the highest fare range', () => {
    Object.values(TRANSPORT_MODES).forEach((config) => {
      if (config.mode === 'intercity') return;
      expect(TRANSPORT_MODES.intercity.fare_max_jod).toBeGreaterThanOrEqual(config.fare_max_jod);
    });
  });

  it('BRT and city_bus have fixed schedules', () => {
    expect(TRANSPORT_MODES.brt.is_fixed_schedule).toBe(true);
    expect(TRANSPORT_MODES.city_bus.is_fixed_schedule).toBe(true);
  });

  it('BRT uses headway departure logic (frequent service)', () => {
    expect(TRANSPORT_MODES.brt.departure_logic).toBe('headway');
    expect(TRANSPORT_MODES.brt.is_frequent_service).toBe(true);
  });

  it('serveece uses on_demand departure logic', () => {
    expect(TRANSPORT_MODES.serveece.departure_logic).toBe('on_demand');
    expect(TRANSPORT_MODES.serveece.is_fixed_schedule).toBe(false);
  });
});

// =============================================================================
// Walking Mode
// =============================================================================
describe('WALKING_MODE', () => {
  it('has gray color and walk speed', () => {
    expect(WALKING_MODE.mode).toBe('walking');
    expect(WALKING_MODE.color).toBe('#6B7280');
    expect(WALKING_MODE.speed_kmh).toBe(5);
    expect(WALKING_MODE.icon).toBe('🚶');
  });
});

// =============================================================================
// COLORS
// =============================================================================
describe('COLORS', () => {
  it('mode colors match TRANSPORT_MODES', () => {
    expect(COLORS.cityBus).toBe(TRANSPORT_MODES.city_bus.color);
    expect(COLORS.brt).toBe(TRANSPORT_MODES.brt.color);
    expect(COLORS.serveece).toBe(TRANSPORT_MODES.serveece.color);
    expect(COLORS.intercity).toBe(TRANSPORT_MODES.intercity.color);
  });

  it('walking color matches WALKING_MODE', () => {
    expect(COLORS.walking).toBe(WALKING_MODE.color);
  });

  it('status colors are distinct', () => {
    expect(COLORS.onTime).not.toBe(COLORS.delayed);
    expect(COLORS.delayed).not.toBe(COLORS.cancelled);
    expect(COLORS.onTime).not.toBe(COLORS.cancelled);
  });

  it('occupancy colors are distinct', () => {
    expect(COLORS.occupancyEmpty).not.toBe(COLORS.occupancyPartial);
    expect(COLORS.occupancyPartial).not.toBe(COLORS.occupancyFull);
  });

  it('has Jordan flag colors defined', () => {
    expect(COLORS.primary).toBe('#1A4F8A');
    expect(COLORS.accent).toBe('#2E7D32');
  });

  it('layer opacity values are rgba strings', () => {
    Object.entries(COLORS.layerOpacity).forEach(([key, val]) => {
      expect(val).toMatch(/^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/);
    });
  });

  it('BRT route layer has highest opacity among routes', () => {
    // Extract opacity values
    const getOpacity = (rgba: string) => parseFloat(rgba.split(',').pop()!.replace(')', '').trim());
    expect(getOpacity(COLORS.layerOpacity.brtRoute)).toBeGreaterThanOrEqual(0.8);
  });
});

// =============================================================================
// OCCUPANCY
// =============================================================================
describe('OCCUPANCY', () => {
  it('has all 3 levels with bilingual labels', () => {
    expect(OCCUPANCY.empty.label_ar).toBeTruthy();
    expect(OCCUPANCY.empty.label_en).toBeTruthy();
    expect(OCCUPANCY.partial.label_ar).toBeTruthy();
    expect(OCCUPANCY.partial.label_en).toBeTruthy();
    expect(OCCUPANCY.full.label_ar).toBeTruthy();
    expect(OCCUPANCY.full.label_en).toBeTruthy();
  });

  it('colors match COLORS.occupancy* keys', () => {
    expect(OCCUPANCY.empty.color).toBe(COLORS.occupancyEmpty);
    expect(OCCUPANCY.partial.color).toBe(COLORS.occupancyPartial);
    expect(OCCUPANCY.full.color).toBe(COLORS.occupancyFull);
  });
});

// =============================================================================
// DEPARTURE_STATUS
// =============================================================================
describe('DEPARTURE_STATUS', () => {
  it('has all 3 statuses with bilingual labels', () => {
    expect(DEPARTURE_STATUS.on_time.label_ar).toBe('في الموعد');
    expect(DEPARTURE_STATUS.delayed.label_ar).toBe('تأخير');
    expect(DEPARTURE_STATUS.cancelled.label_ar).toBe('ملغي');
    expect(DEPARTURE_STATUS.on_time.label_en).toBe('On Time');
    expect(DEPARTURE_STATUS.delayed.label_en).toBe('Delayed');
    expect(DEPARTURE_STATUS.cancelled.label_en).toBe('Cancelled');
  });

  it('colors match COLORS status keys', () => {
    expect(DEPARTURE_STATUS.on_time.color).toBe(COLORS.onTime);
    expect(DEPARTURE_STATUS.delayed.color).toBe(COLORS.delayed);
    expect(DEPARTURE_STATUS.cancelled.color).toBe(COLORS.cancelled);
  });
});

// =============================================================================
// Governorates
// =============================================================================
describe('GOVERNORATES', () => {
  it('contains all 12 Jordanian governorates', () => {
    expect(GOVERNORATES).toHaveLength(12);
    const expected = ['عمان', 'إربد', 'الزرقاء', 'البلقاء', 'مادبا', 'الكرك',
      'الطفيلة', 'معان', 'العقبة', 'جرش', 'عجلون', 'المفرق'];
    expected.forEach((gov) => {
      expect(GOVERNORATES).toContain(gov);
    });
  });

  it('has no duplicates', () => {
    const unique = new Set(GOVERNORATES);
    expect(unique.size).toBe(GOVERNORATES.length);
  });
});

// =============================================================================
// Mapbox Arabic Style
// =============================================================================
describe('MAPBOX_ARABIC_STYLE', () => {
  it('is a valid Mapbox style URL', () => {
    expect(MAPBOX_ARABIC_STYLE).toMatch(/^mapbox:\/\/styles\/.+\/.+$/);
    expect(MAPBOX_ARABIC_STYLE).toContain('arabic');
  });
});