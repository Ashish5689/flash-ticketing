CREATE TYPE "public"."seat_tier" AS ENUM('CLASSIC', 'PRIME', 'RECLINER');--> statement-breakpoint
CREATE TYPE "public"."show_seat_status" AS ENUM('available', 'sold');--> statement-breakpoint
CREATE TYPE "public"."show_status" AS ENUM('scheduled', 'onsale', 'closed', 'cancelled');--> statement-breakpoint
CREATE TABLE "show_pricing" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"tier" "seat_tier" NOT NULL,
	"price_cents" integer NOT NULL,
	CONSTRAINT "show_pricing_price_positive" CHECK ("show_pricing"."price_cents" > 0)
);
--> statement-breakpoint
CREATE TABLE "show_seats" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"show_id" uuid NOT NULL,
	"seat_label" varchar(12) NOT NULL,
	"row_label" varchar(4) NOT NULL,
	"seat_number" integer NOT NULL,
	"tier" "seat_tier" NOT NULL,
	"status" "show_seat_status" DEFAULT 'available' NOT NULL,
	CONSTRAINT "show_seats_number_positive" CHECK ("show_seats"."seat_number" > 0)
);
--> statement-breakpoint
CREATE TABLE "shows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"movie_id" uuid NOT NULL,
	"screen_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" "show_status" DEFAULT 'scheduled' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "show_pricing" ADD CONSTRAINT "show_pricing_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "show_seats" ADD CONSTRAINT "show_seats_show_id_shows_id_fk" FOREIGN KEY ("show_id") REFERENCES "public"."shows"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_movie_id_movies_id_fk" FOREIGN KEY ("movie_id") REFERENCES "public"."movies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shows" ADD CONSTRAINT "shows_screen_id_screens_id_fk" FOREIGN KEY ("screen_id") REFERENCES "public"."screens"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "show_pricing_show_tier_unique" ON "show_pricing" USING btree ("show_id","tier");--> statement-breakpoint
CREATE INDEX "show_pricing_show_idx" ON "show_pricing" USING btree ("show_id");--> statement-breakpoint
CREATE UNIQUE INDEX "show_seats_show_label_unique" ON "show_seats" USING btree ("show_id","seat_label");--> statement-breakpoint
CREATE INDEX "show_seats_show_status_idx" ON "show_seats" USING btree ("show_id","status");--> statement-breakpoint
CREATE INDEX "show_seats_show_tier_idx" ON "show_seats" USING btree ("show_id","tier");--> statement-breakpoint
CREATE UNIQUE INDEX "shows_screen_starts_unique" ON "shows" USING btree ("screen_id","starts_at");--> statement-breakpoint
CREATE INDEX "shows_movie_status_starts_idx" ON "shows" USING btree ("movie_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "shows_screen_status_starts_idx" ON "shows" USING btree ("screen_id","status","starts_at");