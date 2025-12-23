CREATE TYPE "public"."sequence_enum" AS ENUM('head_of_house', 'spouse', 'child');--> statement-breakpoint
ALTER TABLE "household" ALTER COLUMN "type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."household_type_enum";--> statement-breakpoint
CREATE TYPE "public"."household_type_enum" AS ENUM('family', 'single', 'other');--> statement-breakpoint
ALTER TABLE "household" ALTER COLUMN "type" SET DATA TYPE "public"."household_type_enum" USING "type"::"public"."household_type_enum";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "participation" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "participation" SET DEFAULT 'active'::text;--> statement-breakpoint
DROP TYPE "public"."participation_status_enum";--> statement-breakpoint
CREATE TYPE "public"."participation_status_enum" AS ENUM('active', 'deceased', 'homebound', 'military', 'inactive', 'school');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "participation" SET DEFAULT 'active'::"public"."participation_status_enum";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "participation" SET DATA TYPE "public"."participation_status_enum" USING "participation"::"public"."participation_status_enum";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "received_by" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."received_by_enum";--> statement-breakpoint
CREATE TYPE "public"."received_by_enum" AS ENUM('adult_confirmation', 'affirmation_of_faith', 'baptism', 'junior_confirmation', 'transfer', 'with_parents', 'other_denomination', 'unknown');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "received_by" SET DATA TYPE "public"."received_by_enum" USING "received_by"::"public"."received_by_enum";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "sequence" "sequence_enum";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "participation_status";--> statement-breakpoint
DROP TYPE "public"."participation_status_detail_enum";