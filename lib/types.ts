export interface UserType {
    id: string;
    clerkId: string;
    email: string;
    name: string | null;
    profileImageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface ProjectType {
    id: string;
    name: string;
    key: string;
    description: string | null;
    organizationId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface SprintType {
    id: string;
    name: string;
    startDate: Date;
    endDate: Date;
    status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IssueType {
    id: string;
    title: string;
    description: string | null;
    status: "TODO" | "PURCHASE" | "STORE" | "BUFFING" | "PAINTING" | "WINDING" | "ASSEMBLY" | "PACKING" | "SALES";
    order:number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    assigneeId: string | null;
    reporterId: string;
    projectId: string;
    sprintId: string | null;
    createdAt: Date;
    updatedAt: Date;
    track: IssueType["status"][];
}