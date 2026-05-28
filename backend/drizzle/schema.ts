/**
 * دروب — Droob Jordan Transit Database Schema
 * PostgreSQL 16 + PostGIS 3.4
 * Drizzle ORM definitions
 */
import {
  pgTable,
  text,
  uuid,
  timestamp,
  boolean,
  integer,
  real,
  decimal,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ═══════════════════════════════════════════════════════════════
// GOVERNORATES (المحافظات)
// ═══════════════════════════════════════════════════════════════
export const governorates = pgTable(
  "governorates",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name_ar: text("name_ar").notNull().unique(),
    name_en: text("name_en").notNull().unique(),
    code: text("code").notNull().unique(),
    center_lat: real("center_lat").notNull(),
    center_lng: real("center_lng").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_governorates_code: index("idx_governorates_code").on(table.code),
  })
);

export const governoratesRelations = relations(governorates, ({ many }) => ({
  stops: many(stops),
  agencies: many(agencies),
}));

// ═══════════════════════════════════════════════════════════════
// AGENCIES (المشغلون)
// ═══════════════════════════════════════════════════════════════
export const agencies = pgTable(
  "agencies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name_ar: text("name_ar").notNull(),
    name_en: text("name_en").notNull(),
    code: text("code").notNull().unique(),
    mode: text("mode").notNull(), // city_bus | brt | serveece | intercity
    phone: text("phone"),
    website: text("website"),
    logo_url: text("logo_url"),
    governorate_code: text("governorate_code").references(() => governorates.code, { onDelete: "set null" }),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_agencies_code: index("idx_agencies_code").on(table.code),
    idx_agencies_mode: index("idx_agencies_mode").on(table.mode),
  })
);

export const agenciesRelations = relations(agencies, ({ one, many }) => ({
  governorate: one(governorates, {
    fields: [agencies.governorate_code],
    references: [governorates.code],
    relationName: "agency_governorate",
  }),
  routes: many(routes),
  vehicles: many(vehicles),
}));

// ═══════════════════════════════════════════════════════════════
// STOPS (المحطات) — PostGIS enabled
// ═══════════════════════════════════════════════════════════════
export const stops = pgTable(
  "stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull().unique(), // e.g., "LM01", "ST-AM-0001"
    name_ar: text("name_ar").notNull(),
    name_en: text("name_en").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    geo_lat: real("geo_lat"),
    geo_lng: real("geo_lng"),
    geom: text("geom"), // PostGIS geography as text: ST_SetSRID(ST_MakePoint(lng,lat),4326)
    governorate: text("governorate"), // Arabic name e.g., "عمان" — for filtering
    governorate_id: uuid("governorate_id").references(() => governorates.id, { onDelete: "set null" }),
    city: text("city"),
    is_terminal: boolean("is_terminal").notNull().default(false),
    is_landmark: boolean("is_landmark").notNull().default(false),
    has_shelter: boolean("has_shelter").notNull().default(false),
    has_lighting: boolean("has_lighting").notNull().default(false),
    has_accessibility: boolean("has_accessibility").notNull().default(false),
    has_ticket_machine: boolean("has_ticket_machine").notNull().default(false),
    has_ac: boolean("has_ac").notNull().default(false),
    photo_url: text("photo_url"),
    parent_station_id: uuid("parent_station_id"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_stops_code: index("idx_stops_code").on(table.code),
    idx_stops_governorate: index("idx_stops_governorate").on(table.governorate),
    idx_stops_lat_lng: index("idx_stops_lat_lng").on(table.lat, table.lng),
    idx_stops_terminal: index("idx_stops_terminal").on(table.is_terminal),
    // Spatial index via raw SQL migration
  })
);

export const stopsRelations = relations(stops, ({ one, many }) => ({
  governorateRel: one(governorates, {
    fields: [stops.governorate_id],
    references: [governorates.id],
    relationName: "stop_governorate",
  }),
  routeStops: many(routeStops),
  schedules: many(schedules),
  communityReports: many(communityReports),
  originRoutes: many(routes, { relationName: "route_origin" }),
  destinationRoutes: many(routes, { relationName: "route_destination" }),
}));

// ═══════════════════════════════════════════════════════════════
// ROUTES (الخطوط)
// ═══════════════════════════════════════════════════════════════
export const routes = pgTable(
  "routes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(), // e.g., "1", "BRT1", "S01", "IR-AM"
    name_ar: text("name_ar").notNull(),
    name_en: text("name_en").notNull(),
    mode: text("mode").notNull(), // city_bus | brt | serveece | intercity
    agency_id: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
    color: text("color").notNull().default("#0066CC"), // hex color
    origin_stop_id: uuid("origin_stop_id").references(() => stops.id, { onDelete: "set null" }),
    destination_stop_id: uuid("destination_stop_id").references(() => stops.id, { onDelete: "set null" }),
    path_geojson: jsonb("path_geojson"), // GeoJSON LineString
    distance: real("distance"), // meters
    base_fare: decimal("base_fare", { precision: 10, scale: 3 }).notNull().default("0.350"),
    fare_min: decimal("fare_min", { precision: 10, scale: 3 }),
    fare_max: decimal("fare_max", { precision: 10, scale: 3 }),
    is_active: boolean("is_active").notNull().default(true),
    has_friday_schedule: boolean("has_friday_schedule").notNull().default(false),
    has_ramadan_schedule: boolean("has_ramadan_schedule").notNull().default(false),
    headway_peak: integer("headway_peak"), // minutes
    headway_offpeak: integer("headway_offpeak"), // minutes
    first_departure: text("first_departure"), // HH:MM format
    last_departure: text("last_departure"), // HH:MM format
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_routes_code_mode: uniqueIndex("idx_routes_code_mode").on(table.code, table.mode),
    idx_routes_mode: index("idx_routes_mode").on(table.mode),
    idx_routes_agency: index("idx_routes_agency").on(table.agency_id),
    idx_routes_active: index("idx_routes_active").on(table.is_active),
  })
);

export const routesRelations = relations(routes, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [routes.agency_id],
    references: [agencies.id],
    relationName: "route_agency",
  }),
  originStop: one(stops, {
    fields: [routes.origin_stop_id],
    references: [stops.id],
    relationName: "route_origin",
  }),
  destinationStop: one(stops, {
    fields: [routes.destination_stop_id],
    references: [stops.id],
    relationName: "route_destination",
  }),
  routeStops: many(routeStops),
  schedules: many(schedules),
  trips: many(trips),
  vehicles: many(vehicles),
  alerts: many(alerts),
}));

// ═══════════════════════════════════════════════════════════════
// ROUTE STOPS (محطات الخط) — junction table
// ═══════════════════════════════════════════════════════════════
export const routeStops = pgTable(
  "route_stops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    route_id: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    stop_id: uuid("stop_id")
      .notNull()
      .references(() => stops.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    direction: integer("direction").notNull().default(0), // 0=outbound, 1=inbound
    is_boarding_zone: boolean("is_boarding_zone").notNull().default(false), // for serveece
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_route_stops_route_seq: uniqueIndex("idx_route_stops_route_seq").on(table.route_id, table.seq),
    idx_route_stops_stop: index("idx_route_stops_stop").on(table.stop_id),
    idx_route_stops_route: index("idx_route_stops_route").on(table.route_id),
  })
);

export const routeStopsRelations = relations(routeStops, ({ one }) => ({
  route: one(routes, {
    fields: [routeStops.route_id],
    references: [routes.id],
  }),
  stop: one(stops, {
    fields: [routeStops.stop_id],
    references: [stops.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════
// SCHEDULES (الجداول الزمنية)
// ═══════════════════════════════════════════════════════════════
export const schedules = pgTable(
  "schedules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    route_id: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    stop_id: uuid("stop_id")
      .notNull()
      .references(() => stops.id, { onDelete: "cascade" }),
    day_of_week: integer("day_of_week").notNull(), // 0=Sun...6=Sat
    departure_time: text("departure_time").notNull(), // HH:MM
    arrival_time: text("arrival_time"), // HH:MM
    schedule_type: text("schedule_type").notNull().default("weekday"), // weekday | friday | ramadan
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_schedules_route_day: index("idx_schedules_route_day").on(table.route_id, table.day_of_week),
    idx_schedules_stop_day: index("idx_schedules_stop_day").on(table.stop_id, table.day_of_week),
    idx_schedules_type: index("idx_schedules_type").on(table.schedule_type),
  })
);

export const schedulesRelations = relations(schedules, ({ one }) => ({
  route: one(routes, {
    fields: [schedules.route_id],
    references: [routes.id],
  }),
  stop: one(stops, {
    fields: [schedules.stop_id],
    references: [stops.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════
// TRIPS (الرحلات) — individual trip instances
// ═══════════════════════════════════════════════════════════════
export const trips = pgTable(
  "trips",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    route_id: uuid("route_id")
      .notNull()
      .references(() => routes.id, { onDelete: "cascade" }),
    vehicle_id: uuid("vehicle_id").references(() => vehicles.id, { onDelete: "set null" }),
    departure_time: timestamp("departure_time").notNull(),
    arrival_time: timestamp("arrival_time"),
    status: text("status").notNull().default("scheduled"), // scheduled | in_progress | completed | cancelled
    occupancy: text("occupancy"), // empty | partial | full
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_trips_route: index("idx_trips_route").on(table.route_id),
    idx_trips_departure: index("idx_trips_departure").on(table.departure_time),
    idx_trips_status: index("idx_trips_status").on(table.status),
  })
);

export const tripsRelations = relations(trips, ({ one }) => ({
  route: one(routes, {
    fields: [trips.route_id],
    references: [routes.id],
  }),
  vehicle: one(vehicles, {
    fields: [trips.vehicle_id],
    references: [vehicles.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════
// VEHICLES (المركبات)
// ═══════════════════════════════════════════════════════════════
export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    plate: text("plate").notNull().unique(), // e.g., "1-50001"
    type: text("type").notNull(), // bus | brt_bus | minivan | coach
    agency_id: uuid("agency_id").references(() => agencies.id, { onDelete: "set null" }),
    assigned_route_id: uuid("assigned_route_id").references(() => routes.id, { onDelete: "set null" }),
    capacity: integer("capacity").notNull().default(45),
    driver_name: text("driver_name"),
    lat: real("lat"),
    lng: real("lng"),
    bearing: real("bearing").default(0),
    speed: real("speed").default(0),
    is_active: boolean("is_active").notNull().default(true),
    last_gps_update: timestamp("last_gps_update"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_vehicles_plate: index("idx_vehicles_plate").on(table.plate),
    idx_vehicles_agency: index("idx_vehicles_agency").on(table.agency_id),
    idx_vehicles_route: index("idx_vehicles_route").on(table.assigned_route_id),
    idx_vehicles_active: index("idx_vehicles_active").on(table.is_active),
  })
);

export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  agency: one(agencies, {
    fields: [vehicles.agency_id],
    references: [agencies.id],
    relationName: "vehicle_agency",
  }),
  assignedRoute: one(routes, {
    fields: [vehicles.assigned_route_id],
    references: [routes.id],
    relationName: "vehicle_route",
  }),
  trips: many(trips),
}));

// ═══════════════════════════════════════════════════════════════
// ALERTS (التنبيهات والتحذيرات)
// ═══════════════════════════════════════════════════════════════
export const alerts = pgTable(
  "alerts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title_ar: text("title_ar").notNull(),
    title_en: text("title_en").notNull(),
    message_ar: text("message_ar").notNull(),
    message_en: text("message_en").notNull(),
    severity: text("severity").notNull(), // info | warning | critical
    type: text("type").notNull(), // delay | diversion | station_closed | emergency | maintenance
    affected_route_ids: jsonb("affected_route_ids"), // UUID[]
    governorate: text("governorate"),
    start_at: timestamp("start_at").notNull(),
    end_at: timestamp("end_at"),
    is_active: boolean("is_active").notNull().default(true),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_alerts_severity: index("idx_alerts_severity").on(table.severity),
    idx_alerts_active: index("idx_alerts_active").on(table.is_active),
    idx_alerts_start: index("idx_alerts_start").on(table.start_at),
  })
);

// ═══════════════════════════════════════════════════════════════
// COMMUNITY REPORTS (تقارير المجتمع - كراودسورسينج)
// ═══════════════════════════════════════════════════════════════
export const communityReports = pgTable(
  "community_reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    type: text("type").notNull(), // delay | crowding | ended_route | closed_station
    severity: text("severity").notNull().default("low"), // low | medium | high
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    route_code: text("route_code"),
    stop_id: uuid("stop_id").references(() => stops.id, { onDelete: "set null" }),
    message_ar: text("message_ar"),
    message_en: text("message_en"),
    user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    governorate: text("governorate"),
    is_resolved: boolean("is_resolved").notNull().default(false),
    expires_at: timestamp("expires_at").notNull(),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_reports_type: index("idx_reports_type").on(table.type),
    idx_reports_created: index("idx_reports_created").on(table.created_at),
    idx_reports_expires: index("idx_reports_expires").on(table.expires_at),
    idx_reports_resolved: index("idx_reports_resolved").on(table.is_resolved),
  })
);

export const communityReportsRelations = relations(communityReports, ({ one }) => ({
  stop: one(stops, {
    fields: [communityReports.stop_id],
    references: [stops.id],
  }),
  user: one(users, {
    fields: [communityReports.user_id],
    references: [users.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════
// USERS (المستخدمين)
// ═══════════════════════════════════════════════════════════════
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").unique(),
    phone: text("phone").unique(), // +962-7X-XXX-XXXX
    password_hash: text("password_hash").notNull(),
    name: text("name").notNull(),
    preferred_lang: text("preferred_lang").notNull().default("ar"), // ar | en
    role: text("role").notNull().default("passenger"), // passenger | driver | operator | editor | viewer | super_admin
    avatar_url: text("avatar_url"),
    home_lat: real("home_lat"),
    home_lng: real("home_lng"),
    home_label_ar: text("home_label_ar"),
    home_label_en: text("home_label_en"),
    work_lat: real("work_lat"),
    work_lng: real("work_lng"),
    work_label_ar: text("work_label_ar"),
    work_label_en: text("work_label_en"),
    is_verified: boolean("is_verified").notNull().default(false),
    last_login_at: timestamp("last_login_at"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_users_email: index("idx_users_email").on(table.email),
    idx_users_phone: index("idx_users_phone").on(table.phone),
    idx_users_role: index("idx_users_role").on(table.role),
  })
);

export const usersRelations = relations(users, ({ many }) => ({
  communityReports: many(communityReports),
  refreshTokens: many(refreshTokens),
}));

// ═══════════════════════════════════════════════════════════════
// REFRESH TOKENS (رموز التجديد)
// ═══════════════════════════════════════════════════════════════
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expires_at: timestamp("expires_at").notNull(),
    revoked: boolean("revoked").notNull().default(false),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_refresh_user: index("idx_refresh_user").on(table.user_id),
    idx_refresh_expires: index("idx_refresh_expires").on(table.expires_at),
  })
);

export const refreshTokensRelations = relations(refreshTokens, ({ one }) => ({
  user: one(users, {
    fields: [refreshTokens.user_id],
    references: [users.id],
  }),
}));

// ═══════════════════════════════════════════════════════════════
// FARE RULES (نظام الأجرة)
// ═══════════════════════════════════════════════════════════════
export const fareRules = pgTable(
  "fare_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    route_id: uuid("route_id").references(() => routes.id, { onDelete: "cascade" }),
    from_governorate: text("from_governorate"),
    to_governorate: text("to_governorate"),
    distance_min_km: real("distance_min_km"),
    distance_max_km: real("distance_max_km"),
    fare_amount: decimal("fare_amount", { precision: 10, scale: 3 }).notNull(),
    currency: text("currency").notNull().default("JOD"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_fare_route: index("idx_fare_route").on(table.route_id),
  })
);

// ═══════════════════════════════════════════════════════════════
// PRAYER TIMES (مواقيت الصلاة) — cached per day
// ═══════════════════════════════════════════════════════════════
export const prayerTimes = pgTable(
  "prayer_times",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    date: text("date").notNull(), // YYYY-MM-DD
    governorate: text("governorate").notNull(),
    fajr: text("fajr"), // HH:MM
    sunrise: text("sunrise"),
    dhuhr: text("dhuhr"),
    asr: text("asr"),
    maghrib: text("maghrib"),
    isha: text("isha"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_prayer_date_gov: uniqueIndex("idx_prayer_date_gov").on(table.date, table.governorate),
  })
);

// ═══════════════════════════════════════════════════════════════
// ACTIVITY LOGS (سجل النشاطات) — for admin dashboard
// ═══════════════════════════════════════════════════════════════
export const activityLogs = pgTable(
  "activity_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(), // create | update | delete | import | export
    entity_type: text("entity_type").notNull(), // route | stop | vehicle | alert | schedule
    entity_id: uuid("entity_id"),
    details: jsonb("details"),
    ip_address: text("ip_address"),
    created_at: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    idx_activity_user: index("idx_activity_user").on(table.user_id),
    idx_activity_created: index("idx_activity_created").on(table.created_at),
    idx_activity_entity: index("idx_activity_entity").on(table.entity_type),
  })
);

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  user: one(users, {
    fields: [activityLogs.user_id],
    references: [users.id],
  }),
}));