-- Delete existing test attendance records before schema changes
DELETE FROM "attendance";--> statement-breakpoint
CREATE TYPE "public"."service_type_enum" AS ENUM('divine_service', 'midweek_lent', 'midweek_advent', 'festival');--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_date" date NOT NULL,
	"service_type" "service_type_enum" NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "services_date_type_unique" UNIQUE("service_date","service_type")
);
--> statement-breakpoint
ALTER TABLE "attendance" DROP CONSTRAINT "attendance_member_date_unique";--> statement-breakpoint
DROP INDEX "attendance_service_date_idx";--> statement-breakpoint
ALTER TABLE "attendance" ADD COLUMN "service_id" uuid NOT NULL;--> statement-breakpoint
CREATE INDEX "services_service_date_idx" ON "services" USING btree ("service_date");--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "attendance_service_id_idx" ON "attendance" USING btree ("service_id");--> statement-breakpoint
ALTER TABLE "attendance" DROP COLUMN "service_date";--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_member_service_unique" UNIQUE("member_id","service_id");