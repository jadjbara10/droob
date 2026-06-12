/**
 * Backend test setup — runs before all test suites.
 * Configures test database, mocks external services, and
 * provides global helpers.
 */

// ─── Must be set BEFORE any route module is imported ───
// setup.ts runs before test files are loaded, so this ensures
// auth.ts sees the test secret instead of the dev default
process.env.JWT_SECRET = "droob-jordan-test-secret";

import { beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import * as schema from "../drizzle/schema.js";

// ─── Test Database Pool ───
// Use a separate connection for tests (never touch prod)
const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ||
  "postgresql://droob:DroobL0calTest2024!@localhost:5432/droob_test";

let testPool: Pool;
let testDb: ReturnType<typeof drizzle>;

beforeAll(async () => {
  // Create a fresh pool for the test suite
  testPool = new Pool({
    connectionString: TEST_DB_URL,
    max: 5,
  });

  testDb = drizzle(testPool, { schema });

  // Enable PostGIS extension (required for ST_DWithin in trip planner)
  await testPool.query("CREATE EXTENSION IF NOT EXISTS postgis");
  await testPool.query("CREATE EXTENSION IF NOT EXISTS postgis_topology");

  // Run migrations on the test database
  try {
    await migrate(testDb, { migrationsFolder: "./drizzle/migrations" });
  } catch (err) {
    console.warn("[TestSetup] Migration warning (may already exist):", (err as Error).message);
  }

  // Expose for tests
  (globalThis as any).__testDb = testDb;
  (globalThis as any).__testPool = testPool;
}, 30000);

afterAll(async () => {
  // Clean up: truncate all tables
  if (testDb) {
    try {
      await testDb.execute(
        `DO $$ DECLARE
           r RECORD;
         BEGIN
           FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
             EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
           END LOOP;
         END $$;`
      );
    } catch {
      // Table might not exist — safe to ignore
    }
  }

  if (testPool) {
    await testPool.end();
  }
});

// ─── Helpers ───

/**
 * Seed the test database with minimal data.
 * Call within a test or beforeAll block.
 */
export async function seedTestData(data?: {
  agencies?: Array<typeof schema.agencies.$inferInsert>;
  stops?: Array<typeof schema.stops.$inferInsert>;
  routes?: Array<typeof schema.routes.$inferInsert>;
  routeStops?: Array<typeof schema.routeStops.$inferInsert>;
  users?: Array<typeof schema.users.$inferInsert>;
  alerts?: Array<typeof schema.alerts.$inferInsert>;
  schedules?: Array<typeof schema.schedules.$inferInsert>;
}) {
  const db = getTestDb();

  // Default minimal seed so tests get valid reference data
  const defaults = !data
    ? {
        agencies: [FIXTURES.agency()],
        stops: [
          FIXTURES.stop(),
          FIXTURES.stop({
            id: "00000000-0000-0000-0000-000000000011",
            code: "STP002",
            name_ar: "مجمع الجنوب",
            name_en: "South Complex",
            lat: 31.95,
            lng: 35.93,
          }),
        ],
        routes: [FIXTURES.route()],
        routeStops: [],
        users: [FIXTURES.user()],
        alerts: [FIXTURES.alert()],
        schedules: [FIXTURES.schedule()],
      }
    : data;

  if (defaults.agencies?.length) {
    await db.insert(schema.agencies).values(defaults.agencies).onConflictDoNothing();
  }
  if (defaults.stops?.length) {
    await db.insert(schema.stops).values(defaults.stops).onConflictDoNothing();
  }
  if (defaults.routes?.length) {
    await db.insert(schema.routes).values(defaults.routes).onConflictDoNothing();
  }
  if (defaults.routeStops?.length) {
    await db.insert(schema.routeStops).values(defaults.routeStops).onConflictDoNothing();
  }
  if (defaults.users?.length) {
    await db.insert(schema.users).values(defaults.users).onConflictDoNothing();
  }
  if (defaults.alerts?.length) {
    await db.insert(schema.alerts).values(defaults.alerts).onConflictDoNothing();
  }
  if (defaults.schedules?.length) {
    await db.insert(schema.schedules).values(defaults.schedules).onConflictDoNothing();
  }
}

/**
 * Clean up all tables between integration test files.
 */
export async function cleanupTestData() {
  const db = getTestDb();
  try {
    await db.execute(
      `DO $$ DECLARE
         r RECORD;
       BEGIN
         FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
           EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
         END LOOP;
       END $$;`
    );
  } catch {
    // Table might not exist — safe to ignore
  }
}

export function getTestDb() {
  const db = (globalThis as any).__testDb;
  if (!db) throw new Error("Test database not initialized");
  return db as ReturnType<typeof drizzle>;
}

export function getTestPool() {
  const pool = (globalThis as any).__testPool;
  if (!pool) throw new Error("Test pool not initialized");
  return pool as Pool;
}

// ─── Mock Helpers ───

// Mock Redis for all tests
beforeAll(() => {
  // Override Redis module with a mock
  // Tests shouldn't depend on a real Redis instance
  const redisStore = new Map<string, { value: string; ttl?: number }>();

  (globalThis as any).__redisStore = redisStore;
});

beforeEach(() => {
  // Clear Redis store between tests
  const store = (globalThis as any).__redisStore as Map<string, { value: string; ttl?: number }>;
  store?.clear();
});

// ─── Test Fixture Factories ───

export const FIXTURES = {
  agency: (overrides = {}) => ({
    id: "00000000-0000-0000-0000-000000000001",
    name_ar: "هيئة تنظيم النقل البري",
    name_en: "Land Transport Regulatory Commission",
    code: "LTRC",
    mode: "city_bus" as const,
    phone: "+962-6-555-1234",
    website: "https://ltrc.gov.jo",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  stop: (overrides = {}) => ({
    id: "00000000-0000-0000-0000-000000000010",
    code: "STP001",
    name_ar: "مجمع الشمال",
    name_en: "North Complex",
    lat: 31.985,
    lng: 35.905,
    governorate: "عمان",
    city: "عمان",
    is_terminal: true,
    is_landmark: false,
    has_shelter: true,
    has_lighting: true,
    has_accessibility: false,
    has_ticket_machine: false,
    has_ac: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  route: (overrides = {}) => ({
    id: "00000000-0000-0000-0000-000000000100",
    code: "B100",
    name_ar: "باص عمان السريع - الخط 100",
    name_en: "Amman BRT Line 100",
    mode: "brt" as const,
    agency_id: "00000000-0000-0000-0000-000000000001",
    color: "#FF4500",
    origin_stop_id: "00000000-0000-0000-0000-000000000010",
    destination_stop_id: "00000000-0000-0000-0000-000000000011",
    path_geojson: null,
    distance: 15000,
    base_fare: "0.35",
    fare_min: "0.35",
    fare_max: "0.50",
    is_active: true,
    has_friday_schedule: true,
    has_ramadan_schedule: true,
    headway_peak: 5,
    headway_offpeak: 10,
    first_departure: "06:00",
    last_departure: "23:00",
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  user: (overrides = {}) => ({
    id: "00000000-0000-0000-0000-000000001000",
    name: "Test User",
    email: "test@example.com",
    phone: "+962-79-123-4567",
    password_hash: "$2b$12$LJ3m4ys3G5oFz6kQw1xVXeN8rJ7pXYoG6bq0X7ABCdefghijklmno",
    role: "passenger" as const,
    preferred_lang: "ar" as const,
    created_at: new Date(),
    updated_at: new Date(),
    last_login_at: new Date(),
    ...overrides,
  }),

  alert: (overrides = {}) => ({
    id: "00000000-0000-0000-0000-000000010000",
    title_ar: "تنبيه تجريبي",
    title_en: "Test Alert",
    message_ar: "هذا تنبيه تجريبي",
    message_en: "This is a test alert",
    severity: "info" as const,
    type: "maintenance" as const,
    affected_route_ids: null,
    governorate: "عمان",
    start_at: new Date("2026-05-01"),
    end_at: new Date("2026-05-02"),
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),

  schedule: (overrides = {}) => ({
    id: "00000000-0000-0000-0000-000000100000",
    route_id: "00000000-0000-0000-0000-000000000100",
    stop_id: "00000000-0000-0000-0000-000000000010",
    schedule_type: "weekday" as const,
    day_of_week: 1,
    departure_time: "08:00",
    arrival_time: "08:45",
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  }),
};