import { relations } from "drizzle-orm";
import { index, integer, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";


export const sprintStatusEnum = pgEnum("sprint_status", ["PLANNED", "ACTIVE", "COMPLETED"]);
export const issueStatusEnum = pgEnum("issue_status", ["TODO", "PURCHASE", "STORE", "BUFFING", "PAINTING", "WINDING", "ASSEMBLY", "PACKING", "SALES"]);
export const issuePriorityEnum = pgEnum("issue_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);

export const userTable = pgTable('userTable', {
    id: uuid('id').primaryKey().defaultRandom(),
    clerkId: text('clerk_id').notNull().unique(),
    email: text('email').notNull().unique(),
    name: text('name'),
    profileImageUrl: text('profile_image_url'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const projectTable = pgTable('projectTable', {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    key: text('key').notNull(),
    description: text('description'),
    organizationId: text("organization_id").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
    unique().on(table.organizationId, table.key)
]);

export const sprintTable = pgTable("sprintTable", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    startDate: timestamp("start_date").notNull(),
    endDate: timestamp("end_date").notNull(),
    status: sprintStatusEnum("status").default("PLANNED").notNull(),
    projectId: uuid("project_id").notNull().references(() => projectTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const issues = pgTable("issues", {
    // FIXED: Changed from text to uuid to match your architecture
    id: uuid("id").primaryKey().defaultRandom(), 
    title: text("title").notNull(),
    description: text("description"),
    status: issueStatusEnum("status").notNull(),
    order: integer("order").notNull(),
    priority: issuePriorityEnum("priority").notNull(),
    assigneeId: uuid("assignee_id").references(() => userTable.id),
    reporterId: uuid("reporter_id").notNull().references(() => userTable.id),
    projectId: uuid("project_id").notNull().references(() => projectTable.id, { onDelete: "cascade" }),
    sprintId: uuid("sprint_id").references(() => sprintTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (t) => [
    index("status_order_idx").on(t.status, t.order),
]);



// 1. User Relations
export const userRelations = relations(userTable, ({ many }) => ({
    assignedIssues: many(issues, { relationName: "assignee" }),
    reportedIssues: many(issues, { relationName: "reporter" }),
}));

// 2. Project Relations
export const projectRelations = relations(projectTable, ({ many }) => ({
    sprints: many(sprintTable),
    issues: many(issues),
}));

// 3. Sprint Relations
export const sprintRelations = relations(sprintTable, ({ one, many }) => ({
    project: one(projectTable, {
        fields: [sprintTable.projectId],
        references: [projectTable.id],
    }),
    issues: many(issues),
}));

// 4. Issue Relations
export const issueRelations = relations(issues, ({ one }) => ({
    project: one(projectTable, {
        fields: [issues.projectId],
        references: [projectTable.id],
    }),
    sprint: one(sprintTable, {
        fields: [issues.sprintId],
        references: [sprintTable.id],
    }),
    assignee: one(userTable, {
        fields: [issues.assigneeId],
        references: [userTable.id],
        relationName: "assignee",
    }),
    reporter: one(userTable, {
        fields: [issues.reporterId],
        references: [userTable.id],
        relationName: "reporter",
    }),
}));

// export const ProjectSprintRelation = defineRelations({projectTable, sprintTable},(r)=>({
//     sprintTable:{
//         sprintOf:r.one.projectTable({
//             from:r.sprintTable.projectId,
//             to:r.projectTable.id,
//         }),
//     }
// }))