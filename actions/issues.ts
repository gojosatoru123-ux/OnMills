"use server"
import { db } from "@/database/drizzle";
import { issues, userTable } from "@/database/schema";
import { IssueType, ProjectType, SprintType } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq } from "drizzle-orm";

type CreateIssueDataProp={
    title: IssueType['title'],
    assigneeId: IssueType['assigneeId'] | null,
    priority: IssueType['priority'],
    description?: IssueType['description'],
    status: IssueType['status'],
    sprintId: SprintType['id'],
}

export async function createIssue(projectId:ProjectType['id'], data:CreateIssueDataProp) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized");
    }

    let user = await db.select().from(userTable).where(eq(userTable.clerkId, userId)).then(res => res[0]);

    const lastIssue = await db.select().from(issues).where(and(eq(issues.projectId, projectId), eq(issues.status, data.status))).orderBy(desc(issues.order)).limit(1).then(res => res[0]);

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
        title: data.title,
        description: data.description,
        status: data.status,
        priority: data.priority,
        projectId: projectId,
        sprintId: data.sprintId,
        reporterId: user.id,
        assigneeId: data.assigneeId || null,
        order: newOrder,
    }).returning().then(res => res[0])

    return issue;
}

export async function getIssuesForSprint(sprintId:SprintType['id']) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized");
    }

    const issuesdata = await db.query.issues.findMany({
        where: eq(issues.sprintId,sprintId),
        orderBy:[
            asc(issues.status),
            desc(issues.order),
        ],
        with:{
            assignee:true,
            reporter:true
        }
    })

    return issuesdata;
}

export async function deleteIssue(issueId:IssueType['id']) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized");
    }

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
    
    // Check if the issue belongs to the user's current organization
    if (issue.project.organizationId !== orgId) {
        throw new Error("You don't have permission to delete this issue");
    }
    
    // Logic: Allow if user is the reporter OR part of the organization
    if (issue.reporterId !== user[0].id && issue.project.organizationId !== orgId) {
        throw new Error("Unauthorized");
    }

    // await db.issue.delete({ where: { id: issueId } });
    await db.delete(issues).where(eq(issues.id, issueId));

    return { success: true };
}


export async function updateIssue(issueId:IssueType['id'], data:{status:IssueType['status'], priority:IssueType['priority'], assigneeId:IssueType['assigneeId'], track:IssueType['track']}) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized");
    }

    try {
        const issue = await db.query.issues.findFirst({
            where: eq(issues.id,issueId),
            with:{
                project:true
            }
        })

        if (!issue) {
            throw new Error("Issue not found");
        }

        if (issue.project.organizationId !== orgId) {
            throw new Error("Unauthorized");
        }

        // const updatedIssue = await db.update(issues).set({
        //     status:data.status,
        //     priority:data.priority,
        // }).where(eq(issues.id,issueId)).returning().then(res=>res[0]);
        await db.update(issues).set({
                status:data.status,
                priority:data.priority,
                assigneeId:data.assigneeId,
                track: data.track
        }).where(eq(issues.id,issueId))

        const updatedIssue = await db.query.issues.findFirst({
            where: eq(issues.id, issueId),
            with: {
                assignee: true,
                reporter: true,
            },
        });

        return updatedIssue;
    } catch (error) {
        throw new Error("Error updating issue");
    }
}

export async function updateIssueOrder(updatedIssues:{status:IssueType['status'],order:IssueType['order'], id:IssueType['id'], track:IssueType['status'][]}[]) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized");
    }
    await db.transaction(async (tx) => {
        for (const issue of updatedIssues) {
            await tx.update(issues).set({
                status: issue.status,
                order: issue.order,
                track: issue.track,
                updatedAt: new Date(),
            }).where(eq(issues.id, issue.id))
        }
    })
    //(issue.track ?? []) This ensures that if the column is empty (null), the code sees [] instead

    return { success: true };
}
