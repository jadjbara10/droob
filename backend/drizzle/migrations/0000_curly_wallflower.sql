CREATE TABLE IF NOT EXISTS "activity_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid,
	"details" jsonb,
	"ip_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agencies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"code" text NOT NULL,
	"mode" text NOT NULL,
	"phone" text,
	"website" text,
	"logo_url" text,
	"governorate_code" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "agencies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "alerts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text NOT NULL,
	"message_ar" text NOT NULL,
	"message_en" text NOT NULL,
	"severity" text NOT NULL,
	"type" text NOT NULL,
	"affected_route_ids" jsonb,
	"governorate" text,
	"start_at" timestamp NOT NULL,
	"end_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "community_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" text NOT NULL,
	"severity" text DEFAULT 'low' NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"route_code" text,
	"stop_id" uuid,
	"message_ar" text,
	"message_en" text,
	"user_id" uuid,
	"governorate" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "fare_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid,
	"from_governorate" text,
	"to_governorate" text,
	"distance_min_km" real,
	"distance_max_km" real,
	"fare_amount" numeric(10, 3) NOT NULL,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "governorates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"code" text NOT NULL,
	"center_lat" real NOT NULL,
	"center_lng" real NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "governorates_name_ar_unique" UNIQUE("name_ar"),
	CONSTRAINT "governorates_name_en_unique" UNIQUE("name_en"),
	CONSTRAINT "governorates_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "prayer_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" text NOT NULL,
	"governorate" text NOT NULL,
	"fajr" text,
	"sunrise" text,
	"dhuhr" text,
	"asr" text,
	"maghrib" text,
	"isha" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"revoked" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "refresh_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "route_stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"stop_id" uuid NOT NULL,
	"seq" integer NOT NULL,
	"direction" integer DEFAULT 0 NOT NULL,
	"is_boarding_zone" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "routes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"mode" text NOT NULL,
	"agency_id" uuid,
	"color" text DEFAULT '#0066CC' NOT NULL,
	"origin_stop_id" uuid,
	"destination_stop_id" uuid,
	"path_geojson" jsonb,
	"distance" real,
	"base_fare" numeric(10, 3) DEFAULT '0.350' NOT NULL,
	"fare_min" numeric(10, 3),
	"fare_max" numeric(10, 3),
	"is_active" boolean DEFAULT true NOT NULL,
	"has_friday_schedule" boolean DEFAULT false NOT NULL,
	"has_ramadan_schedule" boolean DEFAULT false NOT NULL,
	"headway_peak" integer,
	"headway_offpeak" integer,
	"first_departure" text,
	"last_departure" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"stop_id" uuid NOT NULL,
	"day_of_week" integer NOT NULL,
	"departure_time" text NOT NULL,
	"arrival_time" text,
	"schedule_type" text DEFAULT 'weekday' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"name_ar" text NOT NULL,
	"name_en" text NOT NULL,
	"lat" real NOT NULL,
	"lng" real NOT NULL,
	"geo_lat" real,
	"geo_lng" real,
	"geom" text,
	"governorate" text,
	"governorate_id" uuid,
	"city" text,
	"is_terminal" boolean DEFAULT false NOT NULL,
	"is_landmark" boolean DEFAULT false NOT NULL,
	"has_shelter" boolean DEFAULT false NOT NULL,
	"has_lighting" boolean DEFAULT false NOT NULL,
	"has_accessibility" boolean DEFAULT false NOT NULL,
	"has_ticket_machine" boolean DEFAULT false NOT NULL,
	"has_ac" boolean DEFAULT false NOT NULL,
	"photo_url" text,
	"parent_station_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "stops_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "trips" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"route_id" uuid NOT NULL,
	"vehicle_id" uuid,
	"departure_time" timestamp NOT NULL,
	"arrival_time" timestamp,
	"status" text DEFAULT 'scheduled' NOT NULL,
	"occupancy" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text,
	"phone" text,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"preferred_lang" text DEFAULT 'ar' NOT NULL,
	"role" text DEFAULT 'passenger' NOT NULL,
	"avatar_url" text,
	"home_lat" real,
	"home_lng" real,
	"home_label_ar" text,
	"home_label_en" text,
	"work_lat" real,
	"work_lng" real,
	"work_label_ar" text,
	"work_label_en" text,
	"is_verified" boolean DEFAULT false NOT NULL,
	"last_login_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_phone_unique" UNIQUE("phone")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plate" text NOT NULL,
	"type" text NOT NULL,
	"agency_id" uuid,
	"assigned_route_id" uuid,
	"capacity" integer DEFAULT 45 NOT NULL,
	"driver_name" text,
	"lat" real,
	"lng" real,
	"bearing" real DEFAULT 0,
	"speed" real DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_gps_update" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "vehicles_plate_unique" UNIQUE("plate")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agencies" ADD CONSTRAINT "agencies_governorate_code_governorates_code_fk" FOREIGN KEY ("governorate_code") REFERENCES "public"."governorates"("code") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "community_reports" ADD CONSTRAINT "community_reports_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "fare_rules" ADD CONSTRAINT "fare_rules_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routes" ADD CONSTRAINT "routes_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routes" ADD CONSTRAINT "routes_origin_stop_id_stops_id_fk" FOREIGN KEY ("origin_stop_id") REFERENCES "public"."stops"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "routes" ADD CONSTRAINT "routes_destination_stop_id_stops_id_fk" FOREIGN KEY ("destination_stop_id") REFERENCES "public"."stops"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedules" ADD CONSTRAINT "schedules_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "schedules" ADD CONSTRAINT "schedules_stop_id_stops_id_fk" FOREIGN KEY ("stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "stops" ADD CONSTRAINT "stops_governorate_id_governorates_id_fk" FOREIGN KEY ("governorate_id") REFERENCES "public"."governorates"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "trips" ADD CONSTRAINT "trips_vehicle_id_vehicles_id_fk" FOREIGN KEY ("vehicle_id") REFERENCES "public"."vehicles"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_agency_id_agencies_id_fk" FOREIGN KEY ("agency_id") REFERENCES "public"."agencies"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_assigned_route_id_routes_id_fk" FOREIGN KEY ("assigned_route_id") REFERENCES "public"."routes"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_user" ON "activity_logs" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_created" ON "activity_logs" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_entity" ON "activity_logs" USING btree ("entity_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agencies_code" ON "agencies" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_agencies_mode" ON "agencies" USING btree ("mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_severity" ON "alerts" USING btree ("severity");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_active" ON "alerts" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_alerts_start" ON "alerts" USING btree ("start_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_type" ON "community_reports" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_created" ON "community_reports" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_expires" ON "community_reports" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_reports_resolved" ON "community_reports" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_fare_route" ON "fare_rules" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_governorates_code" ON "governorates" USING btree ("code");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_prayer_date_gov" ON "prayer_times" USING btree ("date","governorate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refresh_user" ON "refresh_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_refresh_expires" ON "refresh_tokens" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_route_stops_route_seq" ON "route_stops" USING btree ("route_id","seq");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_route_stops_stop" ON "route_stops" USING btree ("stop_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_route_stops_route" ON "route_stops" USING btree ("route_id");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "idx_routes_code_mode" ON "routes" USING btree ("code","mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_mode" ON "routes" USING btree ("mode");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_agency" ON "routes" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_routes_active" ON "routes" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedules_route_day" ON "schedules" USING btree ("route_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedules_stop_day" ON "schedules" USING btree ("stop_id","day_of_week");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_schedules_type" ON "schedules" USING btree ("schedule_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stops_code" ON "stops" USING btree ("code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stops_governorate" ON "stops" USING btree ("governorate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stops_lat_lng" ON "stops" USING btree ("lat","lng");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_stops_terminal" ON "stops" USING btree ("is_terminal");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trips_route" ON "trips" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trips_departure" ON "trips" USING btree ("departure_time");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_trips_status" ON "trips" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_phone" ON "users" USING btree ("phone");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users" USING btree ("role");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_plate" ON "vehicles" USING btree ("plate");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_agency" ON "vehicles" USING btree ("agency_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_route" ON "vehicles" USING btree ("assigned_route_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_vehicles_active" ON "vehicles" USING btree ("is_active");