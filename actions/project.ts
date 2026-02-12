"use server"
import { db } from "@/database/drizzle";
import { itemTable, projectStatusTable, projectTable, userTable } from "@/database/schema";
import { ProjectType } from "@/lib/types";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

type CreateProjectType = {
    name: ProjectType['name'],
    key: ProjectType['key'],
    description: ProjectType['description'],
}
export async function createProject(data: CreateProjectType) {
    const { userId, orgId } = await auth();
    if (!userId) throw new Error("unauthorized access");
    if (!orgId) throw new Error("Organization not selected");

    const client = await clerkClient();
    const { data: membershipList } = await client.organizations.getOrganizationMembershipList({
        organizationId: orgId
    });

    const userMembership = membershipList.find(
        (membership) => membership.publicUserData?.userId === userId
    );

    if (!userMembership || userMembership.role !== "org:admin") {
        throw new Error("Only organization admins can create projects");
    }

    try {
        // Use a transaction to ensure both project and stages are created together
        const newProject = await db.transaction(async (tx) => {
            // 1. Create the project
            const [project] = await tx.insert(projectTable).values({
                name: data.name,
                key: data.key,
                description: data.description,
                organizationId: orgId
            }).returning();

            // 2. Define the "Sandwich" stages
            // We use gaps in 'order' (0, 10, 20... 1000) to allow middle stages later
            const defaultStages = [
                { name: "TODO", key: "TODO", order: 0, projectId: project.id },
                { name: "PURCHASE",key: "PURCHASE", order: 1, projectId: project.id },
                { name: "STORE",key: "STORE", order: 2, projectId: project.id },
                { name: "SALES",key: "SALES", order: 101, projectId: project.id },
            ];

            // 3. Insert the stages
            await tx.insert(projectStatusTable).values(defaultStages);
            
            await tx.insert(itemTable).values({
                name: data.name,
                reorderValue: 0,
                projectId: project.id,
                usingQuantity: 0,
                usingUnit: 'UNITS',
                isMainProduct: true,
            })

            return project;
        });

        return newProject;
    } catch (error: any) {
        console.error("Project Creation Error:", error);
        throw new Error(error.message || "Error creating project");
    }
}


export async function deleteProject(projectId: ProjectType['id']) {
    const { userId, orgId, orgRole } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    if (orgRole !== "org:admin") {
        throw new Error("Only organization admins can delete projects");
    }

    try {
        const project = await db.select().from(projectTable).where(eq(projectTable.id, projectId))

        if (!project || project[0].organizationId !== orgId) {
            throw new Error(
                "Project not found or you don't have permission to delete it"
            );
        }

        await db.delete(projectTable).where(eq(projectTable.id, projectId))

        return { success: true };
    } catch (error) {
        throw new Error("Error deleting project")
    }

}


export async function getProject(projectId: ProjectType['id']) {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
        throw new Error("Unauthorized access");
    }

    try {
        // Find user to verify existence
        const user = await db.select().from(userTable).where(eq(userTable.clerkId, userId));


        if (!user) {
            throw new Error("User not found");
        }

        const project = await db.query.projectTable.findFirst({
            where: eq(projectTable.id, projectId),
            with: {
                sprints: {
                    orderBy: (sprints, { asc }) => [asc(sprints.startDate)],
                },
            }
        })
        if (!project) {
            throw new Error("Project not found");
        }

        // Verify project belongs to the organization
        if (project.organizationId !== orgId) {
            return null;
        }
        return project;
    }catch(error){
        throw new Error("Error fetching project")
    }
}