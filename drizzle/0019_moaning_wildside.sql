-- First, update any users with role='super_admin' to role='admin'
-- They will still have isSuperAdmin=true, which is the source of truth for super admin status
UPDATE "user" SET "role" = 'admin' WHERE "role" = 'super_admin';--> statement-breakpoint
-- Now we can safely change the enum
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'viewer'::text;--> statement-breakpoint
DROP TYPE "public"."user_role_enum";--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('admin', 'viewer');--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DEFAULT 'viewer'::"public"."user_role_enum";--> statement-breakpoint
ALTER TABLE "user" ALTER COLUMN "role" SET DATA TYPE "public"."user_role_enum" USING "role"::"public"."user_role_enum";