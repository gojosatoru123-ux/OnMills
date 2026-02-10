import { relations } from "drizzle-orm";
import { boolean, index, integer, pgEnum, pgTable, real, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";


export const sprintStatusEnum = pgEnum("sprint_status", ["PLANNED", "ACTIVE", "COMPLETED"]);
// export const issueStatusEnum = pgEnum("issue_status", ["TODO", "PURCHASE", "STORE", "BUFFING", "PAINTING", "WINDING", "ASSEMBLY", "PACKING", "SALES"]);
export const issuePriorityEnum = pgEnum("issue_priority", ["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const quantityUnitEnum = pgEnum("quantity_unit",["PIECES", "UNITS", "SETS" , "PACKETS", "KILOGRAM","GRAM","TONNE","LITRES", "METERS", "FEET", "INCHES", "SQUARE_METERS", "CUBIC_METERS"]);

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
    isLongSprint: boolean("is_long_sprint").notNull().default(false),
    status: sprintStatusEnum("status").default("PLANNED").notNull(),
    projectId: uuid("project_id").notNull().references(() => projectTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const itemTable = pgTable("itemTable",{
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    reorderValue: real("reorder_value").notNull().default(0),
    projectId: uuid("project_id").notNull().references(()=> projectTable.id, {onDelete:"cascade"}),
    itemUnit: quantityUnitEnum("item_unit").notNull().default('PIECES'),
    usingQuantity: real("using_quantity").notNull().default(1),
    usingUnit: quantityUnitEnum("using_unit").notNull().default('PIECES')
}, (t)=>[
    unique().on(t.projectId, t.name) // No duplicate item names in the same project
])

export const projectStatusTable = pgTable('projectStatusTable', {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull().references(() => projectTable.id, { onDelete: 'cascade' }),
    name: text('name').notNull(), // e.g., "BUFFING", "ASSEMBLY"
    key: text('key').notNull(),
    order: integer('order').notNull(), // To handle the sequence of the workflow
}, (t) => [
    unique().on(t.projectId, t.name),// No duplicate stage names in the same project
    unique().on(t.projectId, t.order)
]);

export const issues = pgTable("issues", {
    // FIXED: Changed from text to uuid to match your architecture
    id: uuid("id").primaryKey().defaultRandom(), 
    itemId: uuid("item_id").notNull().references(()=> itemTable.id, {onDelete:"cascade"}),
    description: text("description"),
    statusId: uuid("status").notNull().references(() => projectStatusTable.id),
    order: integer("order").notNull(),
    priority: issuePriorityEnum("priority").notNull(),
    assigneeId: uuid("assignee_id").references(() => userTable.id),
    reporterId: uuid("reporter_id").notNull().references(() => userTable.id),
    projectId: uuid("project_id").notNull().references(() => projectTable.id, { onDelete: "cascade" }),
    sprintId: uuid("sprint_id").references(() => sprintTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
    track: uuid("track").array().notNull().default([]),

    // New field for inventory tracking
    quantity: real("quantity").notNull().default(1),
    // unit: quantityUnitEnum("unit").notNull().default('PIECES'),
    parentId: uuid("parent_id").references(():any=>issues.id,{onDelete:"cascade"}), // Allows splitting batches by self referencing
    isSplit: boolean("is_split").notNull().default(false) // Flag to indicate if this issue was a result of a split
}, (t) => [
    index("status_order_idx").on(t.statusId, t.order),
    index("item_status_idx").on(t.itemId, t.statusId), // Efficiently sum quantities per phase
]);



// 1. User Relations
export const userRelations = relations(userTable, ({ many }) => ({
    assignedIssues: many(issues, { relationName: "assignee" }),
    reportedIssues: many(issues, { relationName: "reporter" }),
}));

// 2. Project Relations
export const projectRelations = relations(projectTable, ({ many }) => ({
    items: many(itemTable),
    sprints: many(sprintTable),
    issues: many(issues),
    statuses: many(projectStatusTable), // Add this!
}));

// 3. Item Relations
export const itemRelations = relations(itemTable,({ one, many})=>({
    project: one(projectTable,{
        fields:[itemTable.projectId],
        references:[projectTable.id],
    }),
    issues: many(issues)
}))

// newly stage or status relation
export const statusRelations = relations(projectStatusTable,({one, many})=>({
    project: one(projectTable,{
        fields:[projectStatusTable.projectId],
        references:[projectTable.id],
    }),
    issues: many(issues)
}))

// 4. Sprint Relations
export const sprintRelations = relations(sprintTable, ({ one, many }) => ({
    project: one(projectTable, {
        fields: [sprintTable.projectId],
        references: [projectTable.id],
    }),
    issues: many(issues),
}));

// 5. Issue Relations
export const issueRelations = relations(issues, ({ one,many }) => ({
    item: one(itemTable,{
        fields:[issues.itemId],
        references:[itemTable.id],
    }),
    status: one(projectStatusTable,{
        fields:[issues.statusId],
        references:[projectStatusTable.id],
    }),
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
    // relation for tracking split history.
    parent: one(issues, {
        fields: [issues.parentId],
        references: [issues.id],
        relationName: "splitHistory",
    }),
    children: many(issues, {
        relationName: "splitHistory",
    }),
}));