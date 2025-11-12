CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code" text NOT NULL,
	"expires_at" timestamp,
	"accepted_at" timestamp,
	CONSTRAINT "invitations_code_unique" UNIQUE("code")
);
