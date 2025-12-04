-- Drop all existing giving records (test data only)
DELETE FROM "giving";--> statement-breakpoint
-- Drop the old amount column
ALTER TABLE "giving" DROP COLUMN "amount";--> statement-breakpoint
-- Add three new amount columns
ALTER TABLE "giving" ADD COLUMN "general_fund_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "memorials_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "district_synod_amount" numeric(10, 2);

