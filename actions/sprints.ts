"use server"
import { db } from "@/database/drizzle";
import { projectTable, sprintTable } from "@/database/schema";
import { ProjectType, SprintType } from "@/lib/types";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

type CreateSprintDataProp={
    name: SprintType['name'],
    startDate: SprintType['startDate'],
    endDate: SprintType['endDate'],
    isLongSprint: SprintType['isLongSprint']
}
export async function createSprint(projectId:ProjectType['id'], data:CreateSprintDataProp) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }
    try{

        const project = await db.select().from(projectTable).where(eq(projectTable.id, projectId)).then(res => res[0])
    
        if (!project || project.organizationId !== orgId) {
            throw new Error("Project not found");
        }
    
        const sprint = await db.insert(sprintTable).values({
            name: data.name,
            startDate: data.startDate,
            endDate: data.endDate,
            status: "PLANNED",
            projectId: projectId,
            isLongSprint: data.isLongSprint
        }).returning().then(res => res[0]);
    
        return sprint;
    }catch(error){
        throw new Error("Error creating sprint")
    }
}

export async function updateSprintStatus(sprintId:SprintType['id'], newStatus:SprintType['status']) {
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    try {
        const sprint = await db.query.sprintTable.findFirst({
            where:eq(sprintTable.id,sprintId),
            with:{
                project:true
            }
        })

        if (!sprint) {
            throw new Error("Sprint not found");
        }

          if (sprint.project.organizationId !== orgId) {
            throw new Error("Unauthorized access");
          }

        if (orgRole !== "org:admin") {
            throw new Error("Only Admin can make this change");
        }

        const now = new Date();
        const startDate = new Date(sprint.startDate);
        const endDate = new Date(sprint.endDate);

        if (newStatus === "ACTIVE" && (now < startDate || now > endDate)) {
            throw new Error("Cannot start sprint outside of its date range");
        }

        if (newStatus === "COMPLETED" && sprint.status !== "ACTIVE") {
            throw new Error("Can only complete an active sprint");
        }
        const updatedSprint = await db.update(sprintTable).set({ status: newStatus }).where(eq(sprintTable.id, sprintId)).returning().then(res => res[0])

        return { success: true, sprint: updatedSprint };
    } catch (error) {
        throw new Error("Error updating sprint status");
    }
}