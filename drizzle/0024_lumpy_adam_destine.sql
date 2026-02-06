CREATE TABLE "giving_statements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"church_id" uuid NOT NULL,
	"household_id" uuid NOT NULL,
	"year" integer NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"statement_number" text,
	"generated_at" timestamp NOT NULL,
	"generated_by" text NOT NULL,
	"sent_at" timestamp,
	"sent_by" text,
	"email_status" text,
	"pdf_url" text,
	"preview_only" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "giving_statements_household_year_unique" UNIQUE("household_id","year")
);
--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "tax_id" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "is_501c3" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "tax_statement_disclaimer" text;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "goods_services_provided" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "churches" ADD COLUMN "goods_services_statement" text;--> statement-breakpoint
ALTER TABLE "giving_statements" ADD CONSTRAINT "giving_statements_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "giving_statements" ADD CONSTRAINT "giving_statements_household_id_household_id_fk" FOREIGN KEY ("household_id") REFERENCES "public"."household"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "giving_statements_church_id_idx" ON "giving_statements" USING btree ("church_id");--> statement-breakpoint
CREATE INDEX "giving_statements_household_id_idx" ON "giving_statements" USING btree ("household_id");--> statement-breakpoint
CREATE INDEX "giving_statements_year_idx" ON "giving_statements" USING btree ("year");