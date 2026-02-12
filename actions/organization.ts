"use server";

import { db } from "@/database/drizzle";
import { issues, projectTable, userTable } from "@/database/schema";
import { UserType } from "@/lib/types";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { desc, eq, inArray, or } from "drizzle-orm";

export async function getOrganization(slug: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("unauthorized access");

  try {
    // Drizzle returns an array, so we check the first element
    const user = await db.select().from(userTable).where(eq(userTable.clerkId, userId));
    if (user.length === 0) throw new Error("user not found");

    const client = await clerkClient();

    // 1. Await the organization fetch
    const organization = await client.organizations.getOrganization({
      slug,
    });

    if (!organization) {
      return null;
    }

    // 2. Await the membership list fetch before destructuring { data }
    const { data: membership } = await client.organizations.getOrganizationMembershipList({
      organizationId: organization.id,
    });

    const userMembership = membership.find(
      (member) => member.publicUserData?.userId === userId
    );

    if (!userMembership) {
      return null;
    }

    return organization;
  } catch (error) {
    throw new Error("Error fetching organization");
  }

}

export async function getProjects(orgId: string) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized access");
  }
  try {
    const user = await db.select().from(userTable).where(eq(userTable.clerkId, userId));

    if (!user) {
      throw new Error("User not found");
    }

    const projects = await db.select().from(projectTable).where(eq(projectTable.organizationId, orgId)).orderBy(desc(projectTable.createdAt));

    return projects;
  } catch (error) {
    throw new Error("Error fetching projects")
  }

}

export async function getOrganizationUsers(orgId: string | null) {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("Unauthorized access");
  }
  try {
    // const user = await db.user.findUnique({
    //   where: { clerkUserId: userId },
    // });
    const user = await db.select().from(userTable).where(eq(userTable.clerkId, userId));

    if (!user) {
      throw new Error("User not found");
    }
    if (!orgId) {
      throw new Error("Organization not found");
    }

    const client = await clerkClient()

    const organizationMemberships =
      client.organizations.getOrganizationMembershipList({
        organizationId: orgId,
      });

    // const userIds = organizationMemberships.data.map(
    //   (membership) => membership.publicUserData.userId
    // );
    const userIds = (await organizationMemberships).data
      .map((membership) => membership.publicUserData?.userId)
      .filter((id): id is string => !!id);
    // const users = await db.user.findMany({
    //   where: {
    //     clerkUserId: {
    //       in: userIds,
    //     },
    //   },
    // });

    const users = await db.select().from(userTable).where(inArray(userTable.clerkId, userIds))

    return users;
  } catch (error) {
    throw new Error("Error fetching organization users")
  }
}

export async function getUserIssues(userId: UserType['id']) {
  const { orgId } = await auth();

  if (!userId || !orgId) {
    throw new Error("No user id or organization id found");
  }

  try {
    const user = await db.select().from(userTable).where(eq(userTable.clerkId, userId));


    if (!user) {
      throw new Error("User not found");
    }

    const issuesData = await db.query.issues.findMany({
      where: or(eq(issues.assigneeId, user[0].id), eq(issues.reporterId, user[0].id)),
      with: {
        project: true,
        assignee: true,
        reporter: true,
        item: true
      },
      orderBy: [
        desc(issues.updatedAt)
      ]
    })

    return issuesData;
  } catch (error) {
    throw new Error("Error getting user issues")
  }

}
