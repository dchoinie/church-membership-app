-- Update household_type_enum: remove "couple"
CREATE TYPE "public"."household_type_enum_new" AS ENUM('family', 'single', 'other');--> statement-breakpoint
ALTER TABLE "household" ALTER COLUMN "type" TYPE "public"."household_type_enum_new" USING CASE 
  WHEN "type"::text = 'couple' THEN 'other'::household_type_enum_new
  ELSE "type"::text::household_type_enum_new
END;--> statement-breakpoint
DROP TYPE "public"."household_type_enum";--> statement-breakpoint
ALTER TYPE "public"."household_type_enum_new" RENAME TO "household_type_enum";--> statement-breakpoint
-- Update participation_status_enum: replace with new values
CREATE TYPE "public"."participation_status_enum_new" AS ENUM('active', 'deceased', 'homebound', 'military', 'inactive', 'school');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "participation" TYPE "public"."participation_status_enum_new" USING CASE 
  WHEN "participation"::text = 'visitor' THEN 'active'::text::participation_status_enum_new
  WHEN "participation"::text = 'transferred' THEN 'inactive'::text::participation_status_enum_new
  WHEN "participation"::text = 'active' THEN 'active'::text::participation_status_enum_new
  WHEN "participation"::text = 'inactive' THEN 'inactive'::text::participation_status_enum_new
  WHEN "participation"::text = 'deceased' THEN 'deceased'::text::participation_status_enum_new
  ELSE 'active'::text::participation_status_enum_new
END;--> statement-breakpoint
DROP TYPE "public"."participation_status_enum";--> statement-breakpoint
ALTER TYPE "public"."participation_status_enum_new" RENAME TO "participation_status_enum";--> statement-breakpoint
-- Drop participation_status column and participation_status_detail_enum
ALTER TABLE "members" DROP COLUMN IF EXISTS "participation_status";--> statement-breakpoint
DROP TYPE IF EXISTS "public"."participation_status_detail_enum";

