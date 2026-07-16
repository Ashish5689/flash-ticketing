CREATE TYPE "public"."movie_status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."organizer_application_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."theater_status" AS ENUM('active', 'inactive');--> statement-breakpoint
CREATE TABLE "movies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(200) NOT NULL,
	"description" text NOT NULL,
	"poster_url" varchar(2048) NOT NULL,
	"banner_url" varchar(2048),
	"genres" text[] NOT NULL,
	"languages" text[] NOT NULL,
	"duration_min" integer NOT NULL,
	"certificate" varchar(16) NOT NULL,
	"rating" numeric(3, 1) NOT NULL,
	"release_date" date NOT NULL,
	"status" "movie_status" DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "movies_duration_positive" CHECK ("movies"."duration_min" > 0),
	CONSTRAINT "movies_rating_range" CHECK ("movies"."rating" >= 0 AND "movies"."rating" <= 10),
	CONSTRAINT "movies_genres_nonempty" CHECK (cardinality("movies"."genres") > 0),
	CONSTRAINT "movies_languages_nonempty" CHECK (cardinality("movies"."languages") > 0)
);
--> statement-breakpoint
CREATE TABLE "organizer_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"business_name" varchar(180) NOT NULL,
	"phone" varchar(32) NOT NULL,
	"documents" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "organizer_application_status" DEFAULT 'pending' NOT NULL,
	"review_note" varchar(500),
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "screens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"theater_id" uuid NOT NULL,
	"name" varchar(120) NOT NULL,
	"layout" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "screens_layout_has_rows" CHECK (jsonb_array_length("screens"."layout"->'rows') > 0)
);
--> statement-breakpoint
CREATE TABLE "theaters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organizer_id" uuid NOT NULL,
	"name" varchar(180) NOT NULL,
	"city" varchar(120) NOT NULL,
	"address" varchar(500) NOT NULL,
	"status" "theater_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "movies" ADD CONSTRAINT "movies_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizer_profiles" ADD CONSTRAINT "organizer_profiles_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "screens" ADD CONSTRAINT "screens_theater_id_theaters_id_fk" FOREIGN KEY ("theater_id") REFERENCES "public"."theaters"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "theaters" ADD CONSTRAINT "theaters_organizer_id_users_id_fk" FOREIGN KEY ("organizer_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "movies_status_release_idx" ON "movies" USING btree ("status","release_date");--> statement-breakpoint
CREATE INDEX "movies_genres_gin_idx" ON "movies" USING gin ("genres");--> statement-breakpoint
CREATE INDEX "movies_languages_gin_idx" ON "movies" USING gin ("languages");--> statement-breakpoint
CREATE UNIQUE INDEX "organizer_profiles_user_unique" ON "organizer_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "organizer_profiles_status_created_idx" ON "organizer_profiles" USING btree ("status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "screens_theater_name_unique" ON "screens" USING btree ("theater_id","name");--> statement-breakpoint
CREATE INDEX "screens_theater_idx" ON "screens" USING btree ("theater_id");--> statement-breakpoint
CREATE UNIQUE INDEX "theaters_organizer_name_unique" ON "theaters" USING btree ("organizer_id","name");--> statement-breakpoint
CREATE INDEX "theaters_organizer_idx" ON "theaters" USING btree ("organizer_id");--> statement-breakpoint
CREATE INDEX "theaters_city_status_idx" ON "theaters" USING btree ("city","status");