ALTER TABLE "giving" RENAME COLUMN "amount" TO "current_amount";--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "mission_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "memorials_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "debt_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "school_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "giving" ADD COLUMN "miscellaneous_amount" numeric(10, 2);