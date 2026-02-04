CREATE TABLE "user_churches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"church_id" uuid NOT NULL,
	"role" "user_role_enum" DEFAULT 'viewer' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_churches_user_church_unique" UNIQUE("user_id","church_id")
);
--> statement-breakpoint
DROP INDEX "user_church_id_idx";--> statement-breakpoint
ALTER TABLE "user_churches" ADD CONSTRAINT "user_churches_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_churches" ADD CONSTRAINT "user_churches_church_id_churches_id_fk" FOREIGN KEY ("church_id") REFERENCES "public"."churches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_churches_user_id_idx" ON "user_churches" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_churches_church_id_idx" ON "user_churches" USING btree ("church_id");--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "church_id";