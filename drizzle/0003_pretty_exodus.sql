DROP INDEX "families_family_name_idx";--> statement-breakpoint
ALTER TABLE "families" DROP COLUMN "family_name";--> statement-breakpoint
ALTER TABLE "families" DROP COLUMN "address_line1";--> statement-breakpoint
ALTER TABLE "families" DROP COLUMN "address_line2";--> statement-breakpoint
ALTER TABLE "families" DROP COLUMN "city";--> statement-breakpoint
ALTER TABLE "families" DROP COLUMN "state";--> statement-breakpoint
ALTER TABLE "families" DROP COLUMN "zip_code";--> statement-breakpoint
ALTER TABLE "families" DROP COLUMN "home_phone";