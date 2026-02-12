CREATE TYPE "public"."issue_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."quantity_unit" AS ENUM('PIECES', 'UNITS', 'SETS', 'PACKETS', 'KILOGRAM', 'GRAM', 'TONNE', 'LITRES', 'METERS', 'FEET', 'INCHES', 'SQUARE_METERS', 'CUBIC_METERS');--> statement-breakpoint
CREATE TYPE "public"."sprint_status" AS ENUM('PLANNED', 'ACTIVE', 'COMPLETED');--> statement-breakpoint
CREATE TABLE "issues" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"item_id" uuid NOT NULL,
	"description" text,
	"status" uuid NOT NULL,
	"order" integer NOT NULL,
	"priority" "issue_priority" NOT NULL,
	"assignee_id" uuid,
	"reporter_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"sprint_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"track" uuid[] DEFAULT '{}' NOT NULL,
	"quantity" real DEFAULT 1 NOT NULL,
	"parent_id" uuid,
	"is_split" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itemTable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"reorder_value" real DEFAULT 0 NOT NULL,
	"project_id" uuid NOT NULL,
	"item_unit" "quantity_unit" DEFAULT 'PIECES' NOT NULL,
	"using_quantity" real DEFAULT 1 NOT NULL,
	"using_unit" "quantity_unit" DEFAULT 'PIECES' NOT NULL,
	CONSTRAINT "itemTable_project_id_name_unique" UNIQUE("project_id","name")
);
--> statement-breakpoint
CREATE TABLE "projectStatusTable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"order" integer NOT NULL,
	CONSTRAINT "projectStatusTable_project_id_name_unique" UNIQUE("project_id","name"),
	CONSTRAINT "projectStatusTable_project_id_order_unique" UNIQUE("project_id","order")
);
--> statement-breakpoint
CREATE TABLE "projectTable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"key" text NOT NULL,
	"description" text,
	"organization_id" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projectTable_organization_id_key_unique" UNIQUE("organization_id","key")
);
--> statement-breakpoint
CREATE TABLE "sprintTable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"is_long_sprint" boolean DEFAULT false NOT NULL,
	"status" "sprint_status" DEFAULT 'PLANNED' NOT NULL,
	"project_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userTable" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_id" text NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"profile_image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userTable_clerk_id_unique" UNIQUE("clerk_id"),
	CONSTRAINT "userTable_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_item_id_itemTable_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."itemTable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_status_projectStatusTable_id_fk" FOREIGN KEY ("status") REFERENCES "public"."projectStatusTable"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_assignee_id_userTable_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."userTable"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_reporter_id_userTable_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."userTable"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_project_id_projectTable_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projectTable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_sprint_id_sprintTable_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprintTable"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "issues" ADD CONSTRAINT "issues_parent_id_issues_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."issues"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itemTable" ADD CONSTRAINT "itemTable_project_id_projectTable_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projectTable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projectStatusTable" ADD CONSTRAINT "projectStatusTable_project_id_projectTable_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projectTable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprintTable" ADD CONSTRAINT "sprintTable_project_id_projectTable_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projectTable"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "status_order_idx" ON "issues" USING btree ("status","order");--> statement-breakpoint
CREATE INDEX "item_status_idx" ON "issues" USING btree ("item_id","status");