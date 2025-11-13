CREATE TABLE "families" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_name" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"home_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"family_id" uuid,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"membership_date" date NOT NULL,
	"email" text,
	"phone" text,
	"address_line1" text,
	"address_line2" text,
	"city" text,
	"state" text,
	"zip_code" text,
	"date_of_birth" date,
	"baptism_date" date,
	"membership_status" text DEFAULT 'active' NOT NULL,
	"family_role" text,
	"notes" text,
	"photo_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "membership_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"member_id" uuid NOT NULL,
	"field_changed" text NOT NULL,
	"old_value" text,
	"new_value" text,
	"changed_at" timestamp DEFAULT now() NOT NULL,
	"changed_by" text,
	"notes" text
);
--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_family_id_families_id_fk" FOREIGN KEY ("family_id") REFERENCES "public"."families"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "membership_history" ADD CONSTRAINT "membership_history_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "families_family_name_idx" ON "families" USING btree ("family_name");--> statement-breakpoint
CREATE INDEX "members_family_id_idx" ON "members" USING btree ("family_id");--> statement-breakpoint
CREATE INDEX "members_membership_status_idx" ON "members" USING btree ("membership_status");--> statement-breakpoint
CREATE INDEX "members_email_idx" ON "members" USING btree ("email");--> statement-breakpoint
CREATE INDEX "membership_history_member_id_idx" ON "membership_history" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "membership_history_changed_at_idx" ON "membership_history" USING btree ("changed_at");