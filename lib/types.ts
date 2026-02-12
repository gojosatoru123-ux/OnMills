export interface UserType {
    id: string;
    clerkId: string;
    email: string;
    name: string | null;
    profileImageUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export interface ProjectStatusType {
    id: string;
    projectId: string;
    name: string;
    key: string;
    order: number;
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
    isLongSprint: boolean;
    status: 'PLANNED' | 'ACTIVE' | 'COMPLETED';
    projectId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ItemType {
    id: string;
    name: string;
    reorderValue: number;
    itemUnit: 'PIECES' | 'UNITS' | 'SETS' | 'PACKETS' | 'KILOGRAM' | 'GRAM' | 'TONNE' | 'LITRES' | 'METERS' | 'FEET' | 'INCHES' | 'SQUARE_METERS' | 'CUBIC_METERS';
    usingQuantity: number;
    usingUnit: 'PIECES' | 'UNITS' | 'SETS' | 'PACKETS' | 'KILOGRAM' | 'GRAM' | 'TONNE' | 'LITRES' | 'METERS' | 'FEET' | 'INCHES' | 'SQUARE_METERS' | 'CUBIC_METERS';
    projectId: string;
    isMainProduct: boolean;
}

export interface IssueType {
    id: string;
    itemId: string;
    description: string | null;
    statusId: string; // references statusTable.id
    order:number;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
    assigneeId: string | null;
    reporterId: string;
    projectId: string;
    sprintId: string | null;
    createdAt: Date;
    updatedAt: Date;
    track: IssueType['statusId'][];
    quantity: number;
    parentId: string | null;
    isSplit: boolean;
}

export interface Productionlogs {
    id: string;
    producedAt: Date;
    quantityProduced: number;
    sprintId: string;
}

export type DetailedIssue = IssueType & {
    project?: ProjectType;
    assignee: UserType | null;
    reporter: UserType;
    item: ItemType;
    status: ProjectStatusType;
};

export interface ProcessStages {
    [stageName: string]: number;
}

export interface ComponentProcessMap {
    [componentName: string]: ProcessStages;
  }

  export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';