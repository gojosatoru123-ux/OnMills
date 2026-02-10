"use server"
import { db } from "@/database/drizzle";
import { issues, userTable } from "@/database/schema";
import { IssueType, ProjectType, SprintType } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq } from "drizzle-orm";

type CreateIssueDataProp={
    title: IssueType['itemId'],
    assigneeId: IssueType['assigneeId'] | null,
    priority: IssueType['priority'],
    description?: IssueType['description'],
    status: IssueType['statusId'],
    sprintId: SprintType['id'],
    quantity: IssueType['quantity'],
    // unit: IssueType['unit']
}

export async function createIssue(projectId:ProjectType['id'], data:CreateIssueDataProp) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    try{

        let user = await db.select().from(userTable).where(eq(userTable.clerkId, userId)).then(res => res[0]);
    
        const lastIssue = await db.select().from(issues).where(and(eq(issues.projectId, projectId), eq(issues.statusId, data.status))).orderBy(desc(issues.order)).limit(1).then(res => res[0]);
    
        const newOrder = lastIssue ? lastIssue.order + 1 : 0;
    
        // const issue = await db.issue.create({
        //   data: {
        //     title: data.title,
        //     description: data.description,
        //     status: data.status,
        //     priority: data.priority,
        //     projectId: projectId,
        //     sprintId: data.sprintId,
        //     reporterId: user.id,
        //     assigneeId: data.assigneeId || null, // Add this line
        //     order: newOrder,
        //   },
        //   include: {
        //     assignee: true,
        //     reporter: true,
        //   },
        // });
        const issue = await db.insert(issues).values({
            itemId: data.title,
            description: data.description,
            statusId: data.status,
            priority: data.priority,
            projectId: projectId,
            sprintId: data.sprintId,
            reporterId: user.id,
            assigneeId: data.assigneeId || null,
            order: newOrder,
            quantity: data.quantity,
            // unit: data.unit,
            track:[data.status],
        }).returning().then(res => res[0])
    
        return issue;
    }catch(error){
        throw new Error("Error creating issue")
    }

}

export async function getIssuesForSprint(sprintId:SprintType['id']) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    try{
        const issuesdata = await db.query.issues.findMany({
            where: eq(issues.sprintId,sprintId),
            orderBy:[
                desc(issues.order),
            ],
            with:{
                assignee:true,
                reporter:true,
                item:true,
                status:true
            }
        })
    
        return issuesdata;
    }catch(error){
        throw new Error("Error getting issues of sprint")
    }

}

export async function deleteIssue(issueId:IssueType['id']) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    try{
        const user = await db.select().from(userTable).where(eq(userTable.clerkId, userId));
    
        if (!user) {
            throw new Error("User not found");
        }
    
        const issue = await db.query.issues.findFirst({
            where: eq(issues.id,issueId),
            with:{
                project:true
            }
        })
    
        if (!issue) {
            throw new Error("Issue not found");
        }

        if(issue.isSplit){
            throw new Error("Can't be deleted. Delete children first")
        }
        
        // Check if the issue belongs to the user's current organization
        if (issue.project.organizationId !== orgId) {
            throw new Error("You don't have permission to delete this issue");
        }
        
        // Logic: Allow if user is the reporter OR part of the organization
        if (issue.reporterId !== user[0].id && issue.project.organizationId !== orgId) {
            throw new Error("Unauthorized access");
        }
    
        // await db.issue.delete({ where: { id: issueId } });
        await db.delete(issues).where(eq(issues.id, issueId));
    
        return { success: true };
    }catch(error){
        throw new Error("Error deleting issue")
    }

}


export async function updateIssue(
    issueId: string, 
    data: { 
        status: IssueType['statusId'], 
        priority: IssueType['priority'], 
        assigneeId: IssueType['assigneeId'], 
        track: IssueType['track'], 
        quantity: number 
    }
) {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) throw new Error("Unauthorized access");

    try {
        return await db.transaction(async (tx) => {
            const issue = await tx.query.issues.findFirst({
                where: eq(issues.id, issueId),
                with: { project: true }
            });

            if (!issue) throw new Error("Issue not found");
            if (issue.project.organizationId !== orgId) throw new Error("Unauthorized access");

            const currentQty = issue.quantity;
            const moveQty = data.quantity;
            const isSelling = data.status === 'SALES';

            // --- FIX START: Handling the direct update return ---
            if (moveQty === currentQty && data.status !== 'SALES') {
                const updatedRows = await tx.update(issues)
                    .set({
                        statusId: data.status,
                        priority: data.priority,
                        assigneeId: data.assigneeId,
                        track: data.track,
                        updatedAt: new Date(),
                    })
                    .where(eq(issues.id, issueId))
                    .returning(); 

                // Refetch to get relations (Assignee, Item, etc.)
                return await tx.query.issues.findFirst({
                    where: eq(issues.id, updatedRows[0].id),
                    with: { assignee: true, reporter: true, item: true },
                });
            }
            // --- FIX END ---

            if (moveQty === currentQty) {
                if (isSelling) {
                    await tx.delete(issues).where(eq(issues.id, issueId));
                    return { id: issueId, deleted: true }; 
                }

                await tx.update(issues).set({
                    statusId: data.status,
                    priority: data.priority,
                    assigneeId: data.assigneeId,
                    track: data.track,
                    updatedAt: new Date(),
                }).where(eq(issues.id, issueId));

                return await tx.query.issues.findFirst({
                    where: eq(issues.id, issueId),
                    with: { assignee: true, reporter: true, item: true },
                });
            }

            const remainingQty = currentQty - moveQty;
            await tx.update(issues).set({
                quantity: remainingQty,
                isSplit: true,
                updatedAt: new Date(),
            }).where(eq(issues.id, issueId));

            if (isSelling) {
                return await tx.query.issues.findFirst({
                    where: eq(issues.id, issueId),
                    with: { assignee: true, reporter: true, item: true },
                });
            }

            const insertedRows = await tx.insert(issues).values({
                itemId: issue.itemId,
                description: issue.description,
                projectId: issue.projectId,
                reporterId: issue.reporterId,
                assigneeId: data.assigneeId,
                sprintId: issue.sprintId,
                statusId: data.status,
                priority: data.priority,
                order: issue.order,
                quantity: moveQty,
                parentId: issue.id,
                isSplit: false,
                track: [...issue.track, data.status],
            }).returning();

            return await tx.query.issues.findFirst({
                where: eq(issues.id, insertedRows[0].id),
                with: { assignee: true, reporter: true, item: true },
            });
        });
    } catch (error) {
        throw new Error("Error updating issue");
    }
}

export async function updateIssueOrder(updatedIssues:{statusId:IssueType['statusId'],order:IssueType['order'], id:IssueType['id'], track:IssueType['statusId'][]}[]) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized acess");
    }

    try{
        await db.transaction(async (tx) => {
            for (const issue of updatedIssues) {
                await tx.update(issues).set({
                    statusId: issue.statusId,
                    order: issue.order,
                    track: issue.track,
                    updatedAt: new Date(),
                }).where(eq(issues.id, issue.id))
            }
        })
        //(issue.track ?? []) This ensures that if the column is empty (null), the code sees [] instead
    
        return { success: true };
    }catch(error){
        throw new Error("Error updating issue order")
    }
}
