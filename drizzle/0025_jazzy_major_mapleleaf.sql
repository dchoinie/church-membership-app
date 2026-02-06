ALTER TABLE "giving" ADD COLUMN "service_id" uuid;--> statement-breakpoint
ALTER TABLE "giving" ADD CONSTRAINT "giving_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "giving_service_id_idx" ON "giving" USING btree ("service_id");