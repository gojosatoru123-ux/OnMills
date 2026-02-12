"use server";


import { db } from "@/database/drizzle";
import { issues, productLogsTable, userTable } from "@/database/schema";
import { ItemType, ProjectStatusType, SprintType } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface AssemblyUpdate {
    id: string;
    quantity: number;
}

export async function processAssemblyDbUpdate(
    toUpdate: AssemblyUpdate[],
    toDelete: string[],
    projectId: string,
    productionData: { quantityProduced: number; sprintId: string },
    mainItemProduced: ItemType,
    assemblyStatusId: ProjectStatusType['id']
) {
    try {
        const { userId, orgId } = await auth();
        if (!userId || !orgId) {
            throw new Error("Unauthorized access");
        }
        const result = await db.transaction(async (tx) => {
            let user = await tx.select().from(userTable).where(eq(userTable.clerkId, userId)).then(res => res[0]);
            await tx.insert(productLogsTable).values({
                quantityProduced: productionData.quantityProduced,
                sprintId: productionData.sprintId,
                producedAt: new Date(),
            });
            // 1. Bulk Delete fully consumed issues
            if (toDelete.length > 0) {
                await tx.delete(issues).where(inArray(issues.id, toDelete));
            }

            // 2. Update remaining quantities for partial batches
            // Note: PostgreSQL doesn't have a bulk 'update' with different values 
            // in one query easily without 'values' syntax, so we loop or use a CASE.
            for (const item of toUpdate) {
                await tx
                    .update(issues)
                    .set({ quantity: item.quantity, updatedAt: new Date() })
                    .where(eq(issues.id, item.id));
            }
            const lastIssue = await tx.query.issues.findFirst({
                where: eq(issues.statusId, assemblyStatusId),
                orderBy: [desc(issues.order)],
            });
            const nextOrder = (lastIssue?.order ?? 0) + 1;

            const [insertedIssueCTE] = await tx.insert(issues).values({
                itemId: mainItemProduced.id,
                description: "Main Produced Item",
                statusId: assemblyStatusId,
                priority: 'LOW',
                projectId: projectId,
                sprintId: productionData.sprintId,
                reporterId: user.id,
                assigneeId: user.id,
                order: nextOrder,
                quantity: productionData.quantityProduced,
                track: [assemblyStatusId],
            }).returning()

            const mainProducedItem = await tx.query.issues.findFirst({
                where: eq(issues.id,insertedIssueCTE.id),
                orderBy: [
                    desc(issues.order),
                ],
                with: {
                    assignee: true,
                    reporter: true,
                    item: true,
                    status: true
                }
            })

            return mainProducedItem

        });

        revalidatePath(`/projects/${projectId}`);
        return { success: true, data: result };
    } catch (error) {
        console.error("Assembly DB Error:", error);
        return { success: false, error: "Database synchronization failed" };
    }
}

export async function getProductionLogs(sprintId: SprintType['id']) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }
    try {
        const logs = db.select().from(productLogsTable).where(eq(productLogsTable.sprintId, sprintId))
        return logs
    } catch (error) {
        throw new Error("Error fetching Production logs")
    }
}