CREATE TYPE "public"."subscription_plan_enum" AS ENUM('free', 'basic', 'premium');--> statement-breakpoint
CREATE TYPE "public"."subscription_status_enum" AS ENUM('active', 'trialing', 'past_due', 'canceled', 'unpaid');--> statement-breakpoint
CREATE TYPE "public"."user_role_enum" AS ENUM('super_admin', 'admin', 'viewer');--> statement-breakpoint
CREATE TABLE "churches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"subdomain" text NOT NULL,
	"domain" text,
	"address" text,
	"phone" text,
	"email" text,
	"logo_url" text,
	"primary_color" text,
	"subscription_status" "subscription_status_enum" DEFAULT 'trialing' NOT NULL,
	"subscription_plan" "subscription_plan_enum" DEFAULT 'free' NOT NULL,
	"trial_ends_at" timestamp,
	"stripe_customer_id" text,
	"stripe_subscription_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "churches_subdomain_unique" UNIQUE("subdomain")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"stripe_subscription_id" text NOT NULL,
	"stripe_customer_id" text NOT NULL,
	"status" "subscription_status_enum" NOT NULL,
	"plan" "subscription_plan_enum" NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_stripe_subscription_id_unique" UNIQUE("stripe_subscription_id")
);
--> statement-breakpoint
ALTER TABLE "services" DROP CONSTRAINT "services_date_type_unique";--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "church_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "invitations" ADD COLUMN "church_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "church_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "church_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "church_id" uuid;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "role" "user_role_enum" DEFAULT 'viewer' NOT NULL;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_super_admin" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "churches_subdomain_idx" ON "churches" USING btree ("subdomain");--> statement-breakpoint
CREATE INDEX "churches_stripe_customer_id_idx" ON "churches" USING btree ("stripe_customer_id");--> statement-breakpoint
CREATE INDEX "subscriptions_church_id_idx" ON "subscriptions" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "subscriptions_stripe_subscription_id_idx" ON "subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
ALTER TABLE "household" ADD CONSTRAINT "household_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "household_church_id_idx" ON "household" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "invitations_church_id_idx" ON "invitations" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "members_church_id_idx" ON "members" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "services_church_id_idx" ON "services" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "user_church_id_idx" ON "user" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "user_email_idx" ON "user" USING btree ("email");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_church_date_type_unique" UNIQUE("church_id","service_date","service_type");