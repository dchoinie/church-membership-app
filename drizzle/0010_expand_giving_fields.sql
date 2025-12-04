-- Rename existing columns
ALTER TABLE "giving" RENAME COLUMN "general_fund_amount" TO "current_amount";--> statement-breakpoint
ALTER TABLE "giving" RENAME COLUMN "district_synod_amount" TO "mission_amount";--> statement-breakpoint
-- Add new columns
ALTER TABLE "giving" ADD COLUMN "debt_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "school_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "miscellaneous_amount" numeric(10, 2);

