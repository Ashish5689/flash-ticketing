CREATE TYPE "public"."catalog_content_type" AS ENUM('movie', 'event');--> statement-breakpoint
ALTER TABLE "movies" ADD COLUMN "content_type" "catalog_content_type" DEFAULT 'movie' NOT NULL;--> statement-breakpoint
CREATE INDEX "movies_content_type_status_idx" ON "movies" USING btree ("content_type","status");