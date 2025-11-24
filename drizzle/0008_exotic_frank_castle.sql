CREATE TYPE "public"."participation_status_enum" AS ENUM('active', 'visitor', 'inactive', 'transferred', 'deceased');--> statement-breakpoint
CREATE TYPE "public"."received_by_enum" AS ENUM('baptism', 'confirmation', 'transfer', 'profession', 'other');--> statement-breakpoint
CREATE TYPE "public"."sex_enum" AS ENUM('male', 'female', 'other');--> statement-breakpoint
CREATE TYPE "public"."household_type_enum" AS ENUM('family', 'single', 'couple', 'other');--> statement-breakpoint
ALTER TABLE "families" RENAME TO "household";--> statement-breakpoint
ALTER TABLE "members" RENAME COLUMN "family_id" TO "household_id";--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_email_unique";--> statement-breakpoint
ALTER TABLE "household" DROP CONSTRAINT "families_parent_family_id_families_id_fk";
--> statement-breakpoint
ALTER TABLE "members" DROP CONSTRAINT "members_family_id_families_id_fk";
--> statement-breakpoint
DROP INDEX "members_family_id_idx";--> statement-breakpoint
DROP INDEX "members_membership_status_idx";--> statement-breakpoint
DROP INDEX "members_email_idx";--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "type" "household_type_enum";--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "is_non_household" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "person_assigned" uuid;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "ministry_group" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "address1" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "address2" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "state" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "zip" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "country" text;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "alternate_address_begin" date;--> statement-breakpoint
ALTER TABLE "household" ADD COLUMN "alternate_address_end" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "middle_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "suffix" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "preferred_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "maiden_name" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "title" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "sex" "sex_enum";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "email1" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "email2" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "phone_home" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "phone_cell1" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "phone_cell2" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "confirmation_date" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "received_by" "received_by_enum";--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "date_received" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "removed_by" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "date_removed" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "deceased_date" date;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "membership_code" text;--> statement-breakpoint
ALTER TABLE "members" ADD COLUMN "participation" "participation_status_enum" DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "members_household_id_idx" ON "members" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "members_participation_idx" ON "members" USING btree ("participation");--> statement-breakpoint
CREATE INDEX "members_email1_idx" ON "members" USING btree ("email1");--> statement-breakpoint
ALTER TABLE "household" DROP COLUMN "parent_family_id";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "membership_date";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "phone";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "address_line1";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "address_line2";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "zip_code";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "membership_status";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "family_role";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "head_of_household";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "notes";--> statement-breakpoint
ALTER TABLE "members" DROP COLUMN "photo_url";--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_email1_unique" UNIQUE("email1");--> statement-breakpoint
DROP TYPE "public"."membership_status_enum";--> statement-breakpoint
DROP TYPE "public"."family_role_enum";