CREATE TYPE "public"."sequence_enum" AS ENUM('head_of_house', 'spouse', 'child');--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "sequence" "sequence_enum";--> statement-breakpoint
CREATE TYPE "public"."received_by_enum_new" AS ENUM('adult_confirmation', 'affirmation_of_faith', 'baptism', 'junior_confirmation', 'transfer', 'with_parents', 'other_denomination', 'unknown');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "received_by" TYPE "received_by_enum_new" USING "received_by"::text::"received_by_enum_new";--> statement-breakpoint
DROP TYPE "public"."received_by_enum";--> statement-breakpoint
ALTER TYPE "public"."received_by_enum_new" RENAME TO "received_by_enum";

