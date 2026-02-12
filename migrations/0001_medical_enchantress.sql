CREATE TABLE "productionLogsTable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"quantity_produced" real NOT NULL,
	"sprint_id" uuid
);
--> statement-breakpoint
ALTER TABLE "productionLogsTable" ADD CONSTRAINT "productionLogsTable_sprint_id_sprintTable_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprintTable"("id") ON DELETE set null ON UPDATE no action;