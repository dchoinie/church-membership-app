CREATE TABLE "giving_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"name" text NOT NULL,
	"display_order" integer DEFAULT 0 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "giving_categories_church_name_unique" UNIQUE("church_id","name")
);
--> statement-breakpoint
CREATE TABLE "giving_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"giving_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "giving_items_giving_category_unique" UNIQUE("giving_id","category_id")
);
--> statement-breakpoint
ALTER TABLE "giving_categories" ADD CONSTRAINT "giving_categories_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giving_items" ADD CONSTRAINT "giving_items_giving_id_giving_id_fk" FOREIGN KEY ("giving_id") REFERENCES "public"."giving"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giving_items" ADD CONSTRAINT "giving_items_category_id_giving_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."giving_categories"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "giving_categories_church_id_idx" ON "giving_categories" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "giving_items_giving_id_idx" ON "giving_items" USING btree ("giving_id");--> statement-breakpoint
CREATE INDEX "giving_items_category_id_idx" ON "giving_items" USING btree ("category_id");--> statement-breakpoint
-- Create default categories for each existing church
INSERT INTO "giving_categories" ("church_id", "name", "display_order", "is_active")
SELECT 
	"id" as "church_id",
	'Current' as "name",
	1 as "display_order",
	true as "is_active"
FROM "churches"
ON CONFLICT ("church_id", "name") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_categories" ("church_id", "name", "display_order", "is_active")
SELECT 
	"id" as "church_id",
	'Mission' as "name",
	2 as "display_order",
	true as "is_active"
FROM "churches"
ON CONFLICT ("church_id", "name") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_categories" ("church_id", "name", "display_order", "is_active")
SELECT 
	"id" as "church_id",
	'Memorials' as "name",
	3 as "display_order",
	true as "is_active"
FROM "churches"
ON CONFLICT ("church_id", "name") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_categories" ("church_id", "name", "display_order", "is_active")
SELECT 
	"id" as "church_id",
	'Debt' as "name",
	4 as "display_order",
	true as "is_active"
FROM "churches"
ON CONFLICT ("church_id", "name") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_categories" ("church_id", "name", "display_order", "is_active")
SELECT 
	"id" as "church_id",
	'School' as "name",
	5 as "display_order",
	true as "is_active"
FROM "churches"
ON CONFLICT ("church_id", "name") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_categories" ("church_id", "name", "display_order", "is_active")
SELECT 
	"id" as "church_id",
	'Miscellaneous' as "name",
	6 as "display_order",
	true as "is_active"
FROM "churches"
ON CONFLICT ("church_id", "name") DO NOTHING;--> statement-breakpoint
-- Migrate existing giving data to giving_items
INSERT INTO "giving_items" ("giving_id", "category_id", "amount")
SELECT 
	g."id" as "giving_id",
	gc."id" as "category_id",
	g."current_amount"::numeric(10,2) as "amount"
FROM "giving" g
INNER JOIN "members" m ON g."member_id" = m."id"
INNER JOIN "giving_categories" gc ON gc."church_id" = m."church_id" AND gc."name" = 'Current'
WHERE g."current_amount" IS NOT NULL AND CAST(g."current_amount" AS numeric) > 0
ON CONFLICT ("giving_id", "category_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_items" ("giving_id", "category_id", "amount")
SELECT 
	g."id" as "giving_id",
	gc."id" as "category_id",
	g."mission_amount"::numeric(10,2) as "amount"
FROM "giving" g
INNER JOIN "members" m ON g."member_id" = m."id"
INNER JOIN "giving_categories" gc ON gc."church_id" = m."church_id" AND gc."name" = 'Mission'
WHERE g."mission_amount" IS NOT NULL AND CAST(g."mission_amount" AS numeric) > 0
ON CONFLICT ("giving_id", "category_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_items" ("giving_id", "category_id", "amount")
SELECT 
	g."id" as "giving_id",
	gc."id" as "category_id",
	g."memorials_amount"::numeric(10,2) as "amount"
FROM "giving" g
INNER JOIN "members" m ON g."member_id" = m."id"
INNER JOIN "giving_categories" gc ON gc."church_id" = m."church_id" AND gc."name" = 'Memorials'
WHERE g."memorials_amount" IS NOT NULL AND CAST(g."memorials_amount" AS numeric) > 0
ON CONFLICT ("giving_id", "category_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_items" ("giving_id", "category_id", "amount")
SELECT 
	g."id" as "giving_id",
	gc."id" as "category_id",
	g."debt_amount"::numeric(10,2) as "amount"
FROM "giving" g
INNER JOIN "members" m ON g."member_id" = m."id"
INNER JOIN "giving_categories" gc ON gc."church_id" = m."church_id" AND gc."name" = 'Debt'
WHERE g."debt_amount" IS NOT NULL AND CAST(g."debt_amount" AS numeric) > 0
ON CONFLICT ("giving_id", "category_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_items" ("giving_id", "category_id", "amount")
SELECT 
	g."id" as "giving_id",
	gc."id" as "category_id",
	g."school_amount"::numeric(10,2) as "amount"
FROM "giving" g
INNER JOIN "members" m ON g."member_id" = m."id"
INNER JOIN "giving_categories" gc ON gc."church_id" = m."church_id" AND gc."name" = 'School'
WHERE g."school_amount" IS NOT NULL AND CAST(g."school_amount" AS numeric) > 0
ON CONFLICT ("giving_id", "category_id") DO NOTHING;--> statement-breakpoint
INSERT INTO "giving_items" ("giving_id", "category_id", "amount")
SELECT 
	g."id" as "giving_id",
	gc."id" as "category_id",
	g."miscellaneous_amount"::numeric(10,2) as "amount"
FROM "giving" g
INNER JOIN "members" m ON g."member_id" = m."id"
INNER JOIN "giving_categories" gc ON gc."church_id" = m."church_id" AND gc."name" = 'Miscellaneous'
WHERE g."miscellaneous_amount" IS NOT NULL AND CAST(g."miscellaneous_amount" AS numeric) > 0
ON CONFLICT ("giving_id", "category_id") DO NOTHING;--> statement-breakpoint
ALTER TABLE "giving" DROP COLUMN "current_amount";--> statement-breakpoint
ALTER TABLE "giving" DROP COLUMN "mission_amount";--> statement-breakpoint
ALTER TABLE "giving" DROP COLUMN "memorials_amount";--> statement-breakpoint
ALTER TABLE "giving" DROP COLUMN "debt_amount";--> statement-breakpoint
ALTER TABLE "giving" DROP COLUMN "school_amount";--> statement-breakpoint
ALTER TABLE "giving" DROP COLUMN "miscellaneous_amount";
