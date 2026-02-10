"use server"
import { db } from "@/database/drizzle";
import { itemTable, projectTable, userTable } from "@/database/schema";
import { ItemType, ProjectType } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

export async function createItem(projectId: ProjectType['id'], itemName: ItemType['name'], itemReorderValue: ItemType['reorderValue'], itemUnit: ItemType['itemUnit'], usingQuantity: ItemType['usingQuantity'], usingUnit: ItemType['usingUnit']) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    try{
        const project = await db.select().from(projectTable).where(eq(projectTable.id, projectId)).then(res => res[0])
    
        if (!project || project.organizationId !== orgId) {
            throw new Error("Project not found");
        }
    
        const item = await db.insert(itemTable).values({
            name: itemName,
            reorderValue: itemReorderValue,
            projectId: projectId,
            itemUnit: itemUnit,
            usingQuantity: usingQuantity,
            usingUnit: usingUnit
        }).returning().then(res => res[0]);
        return item
    }catch(error){
        throw new Error("Error creating item")
    }

}

export async function getProjectItems(projectId: ProjectType['id']) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    try{
        const project = await db.select().from(projectTable).where(eq(projectTable.id, projectId)).then(res => res[0]);
    
        if (!project || project.organizationId !== orgId) {
            throw new Error("Project not found");
        }
    
        const items = await db.select().from(itemTable).where(eq(itemTable.projectId, projectId)).orderBy(itemTable.name);
        return items;
    }catch(error){
        throw new Error("Error fetching project items")
    }

}

export async function deleteItem(itemId: ItemType['id'], projectId: ProjectType['id']) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        throw new Error("Unauthorized access")
    }
    try{
        const user = await db.select().from(userTable).where(eq(userTable.clerkId, userId));
    
        if (!user) {
            throw new Error("User not found");
        }
        const item = await db.query.itemTable.findFirst({
            where: eq(itemTable.id, itemId),
            with: {
                project: true
            }
        })
        if (!item) {
            throw new Error("Issue not found");
        }
    
        // Check if the issue belongs to the user's current organization
        if (item.project.organizationId !== orgId) {
            throw new Error("You don't have permission to delete this issue");
        }
    
        // await db.issue.delete({ where: { id: issueId } });
        await db.delete(itemTable).where(and(eq(itemTable.id, itemId),eq(itemTable.projectId,projectId)));
    
        return { success: true };
    }catch(error){
        throw new Error("Error deleting items")
    }
}