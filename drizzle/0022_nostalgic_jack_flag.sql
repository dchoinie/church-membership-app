ALTER TABLE "churches" ALTER COLUMN "subscription_status" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "subscription_status" SET DEFAULT 'unpaid'::text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."subscription_status_enum";--> statement-breakpoint
CREATE TYPE "public"."subscription_status_enum" AS ENUM('active', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "subscription_status" SET DEFAULT 'unpaid'::"public"."subscription_status_enum";--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "subscription_status" SET DATA TYPE "public"."subscription_status_enum" USING "subscription_status"::"public"."subscription_status_enum";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "status" SET DATA TYPE "public"."subscription_status_enum" USING "status"::"public"."subscription_status_enum";