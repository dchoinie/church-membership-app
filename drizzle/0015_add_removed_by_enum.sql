CREATE TYPE "public"."removed_by_enum" AS ENUM('death', 'excommunication', 'inactivity', 'moved_no_transfer', 'released', 'removed_by_request', 'transfer', 'other');--> statement-breakpoint
ALTER TABLE "members" ALTER COLUMN "removed_by" TYPE "public"."removed_by_enum" USING CASE 
  WHEN "removed_by" IS NULL THEN NULL
  WHEN LOWER("removed_by"::text) IN ('death', 'excommunication', 'inactivity', 'moved_no_transfer', 'moved (no transfer)', 'released', 'removed_by_request', 'removed by request', 'transfer', 'other') THEN 
    CASE LOWER("removed_by"::text)
      WHEN 'moved (no transfer)' THEN 'moved_no_transfer'::removed_by_enum
      WHEN 'removed by request' THEN 'removed_by_request'::removed_by_enum
      ELSE LOWER("removed_by"::text)::removed_by_enum
    END
  ELSE 'other'::removed_by_enum
END;

