ALTER TABLE "churches" ALTER COLUMN "subscription_plan" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "subscription_plan" SET DEFAULT 'basic'::text;--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."subscription_plan_enum";--> statement-breakpoint
CREATE TYPE "public"."subscription_plan_enum" AS ENUM('basic', 'premium');--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "subscription_plan" SET DEFAULT 'basic'::"public"."subscription_plan_enum";--> statement-breakpoint
ALTER TABLE "churches" ALTER COLUMN "subscription_plan" SET DATA TYPE "public"."subscription_plan_enum" USING "subscription_plan"::"public"."subscription_plan_enum";--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DATA TYPE "public"."subscription_plan_enum" USING "plan"::"public"."subscription_plan_enum";--> statement-breakpoint
ALTER TABLE "services" ALTER COLUMN "service_type" SET DATA TYPE text;