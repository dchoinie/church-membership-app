CREATE TABLE "two_factor_reset_token" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"token" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "two_factor_reset_token_token_unique" UNIQUE("token")
);
--> statement-breakpoint
ALTER TABLE "two_factor_reset_token" ADD CONSTRAINT "two_factor_reset_token_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "two_factor_reset_token_user_id_idx" ON "two_factor_reset_token" USING btree ("user_id");