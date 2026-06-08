CREATE TABLE IF NOT EXISTS "ad_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"ad_type" text NOT NULL,
	"ad_network" text NOT NULL,
	"event_type" text NOT NULL,
	"placement" text NOT NULL,
	"revenue_usd" real DEFAULT 0,
	"reward_type" text,
	"reward_claimed" boolean DEFAULT false,
	"ecpm" real,
	"fill_available" boolean,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "device_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" text NOT NULL,
	"platform" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "device_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "email_verification_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"purpose" text DEFAULT 'verify' NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "feedback" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"type" text NOT NULL,
	"subject" text NOT NULL,
	"message" text NOT NULL,
	"app_version" text,
	"device_info" jsonb,
	"screenshot_url" text,
	"is_resolved" boolean DEFAULT false NOT NULL,
	"admin_notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_jod" numeric(10, 3) NOT NULL,
	"currency" text DEFAULT 'JOD' NOT NULL,
	"method" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"reference_id" text,
	"ticket_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	CONSTRAINT "payments_reference_id_unique" UNIQUE("reference_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "push_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title_ar" text NOT NULL,
	"title_en" text,
	"body_ar" text NOT NULL,
	"body_en" text,
	"type" text,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"delivered_count" integer DEFAULT 0 NOT NULL,
	"opened_count" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "tickets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"route_id" uuid NOT NULL,
	"from_stop_id" uuid NOT NULL,
	"to_stop_id" uuid NOT NULL,
	"fare_jod" numeric(10, 3) NOT NULL,
	"qr_code" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"purchased_at" timestamp DEFAULT now() NOT NULL,
	"used_at" timestamp,
	"expires_at" timestamp NOT NULL,
	CONSTRAINT "tickets_qr_code_unique" UNIQUE("qr_code")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "user_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp,
	"purchase_token" text,
	"product_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_jod" numeric(10, 3) NOT NULL,
	"type" text NOT NULL,
	"balance_before" numeric(10, 3),
	"balance_after" numeric(10, 3),
	"reference" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "feedback" ADD CONSTRAINT "feedback_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_ticket_id_tickets_id_fk" FOREIGN KEY ("ticket_id") REFERENCES "public"."tickets"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_route_id_routes_id_fk" FOREIGN KEY ("route_id") REFERENCES "public"."routes"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_from_stop_id_stops_id_fk" FOREIGN KEY ("from_stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "tickets" ADD CONSTRAINT "tickets_to_stop_id_stops_id_fk" FOREIGN KEY ("to_stop_id") REFERENCES "public"."stops"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "user_subscriptions" ADD CONSTRAINT "user_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ad_events_user" ON "ad_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ad_events_type" ON "ad_events" USING btree ("ad_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ad_events_network" ON "ad_events" USING btree ("ad_network");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ad_events_created" ON "ad_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_ad_events_event" ON "ad_events" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_device_tokens_user" ON "device_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_device_tokens_active" ON "device_tokens" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_verification_email" ON "email_verification_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_email_verification_expires" ON "email_verification_codes" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_type" ON "feedback" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_user" ON "feedback" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_resolved" ON "feedback" USING btree ("is_resolved");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_feedback_created" ON "feedback" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_user" ON "payments" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_status" ON "payments" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_payments_reference" ON "payments" USING btree ("reference_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_notifications_type" ON "push_notifications" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_push_notifications_sent" ON "push_notifications" USING btree ("sent_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tickets_user" ON "tickets" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tickets_route" ON "tickets" USING btree ("route_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tickets_status" ON "tickets" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_tickets_qr" ON "tickets" USING btree ("qr_code");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_user" ON "user_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_type" ON "user_subscriptions" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_user_subscriptions_status" ON "user_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_user" ON "wallet_transactions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_type" ON "wallet_transactions" USING btree ("type");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_wallet_created" ON "wallet_transactions" USING btree ("created_at");