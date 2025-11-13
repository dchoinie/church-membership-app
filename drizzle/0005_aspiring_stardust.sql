CREATE TYPE "public"."family_role_enum" AS ENUM('father', 'mother', 'son', 'daughter');--> statement-breakpoint
CREATE TYPE "public"."membership_status_enum" AS ENUM('active', 'inactive', 'pending', 'transferred', 'deceased');--> statement-breakpoint
-- Update existing membership_status values to match enum (map invalid values to 'active')
UPDATE "members" SET "membership_status" = 'active' WHERE "membership_status" NOT IN ('active', 'inactive', 'pending', 'transferred', 'deceased');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "membership_status" SET DEFAULT 'active'::"public"."membership_status_enum";--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "membership_status" SET DATA TYPE "public"."membership_status_enum" USING "membership_status"::"public"."membership_status_enum";--> statement-breakpoint
-- Update existing family_role values (set invalid values to NULL)
UPDATE "members" SET "family_role" = NULL WHERE "family_role" IS NOT NULL AND "family_role" NOT IN ('father', 'mother', 'son', 'daughter');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "family_role" SET DATA TYPE "public"."family_role_enum" USING "family_role"::"public"."family_role_enum";