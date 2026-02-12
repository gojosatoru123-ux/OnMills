'use client'

import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import IssueCreationDrawer from "./create-issue";
import React, { useEffect, useState } from "react";
import SprintManager from "./sprint-manager";
// import statuses from "@/data/status.json";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import { getIssuesForSprint, updateIssue } from "@/actions/issues";
import { BarLoader } from "react-spinners";
import IssueCard from "@/components/issue-card";
import { toast } from "sonner";
import BoardFilters from "./board-filters";
import { Plus, CircleDot, MergeIcon } from "lucide-react";
import { DetailedIssue, IssueType, ItemType, ProjectStatusType, ProjectType, SprintType, UserType } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IssuesTable from "@/components/issues-table";
import IssueLifecycleDisplay from "@/components/issue-lifecycle-display";
import Inventory from "@/components/inventory";
import Calculator from "@/components/calculator";
import { processAssemblyDbUpdate } from "@/actions/assembly";
import ProductionLogs from "@/components/production-logs";
import { useRouter } from "next/navigation";



type Props = {
    sprints: SprintType[],
    projectId: ProjectType['id'],
    orgId: ProjectType['organizationId']
    statuses: ProjectStatusType[]
    projectItems: ItemType[]
    mainItemProduced: ItemType;
    orgUsers: UserType[]
}

const SprintBoard = ({ sprints, projectId, orgId, statuses, projectItems, mainItemProduced, orgUsers }: Props) => {
    const [currentSprint, setCurrentSprint] = useState<SprintType>(
        sprints.find((spr) => spr.status === "ACTIVE") || sprints[0]
    );
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<IssueType['statusId']>(statuses[0]["id"]);
    const [isMobile, setIsMobile] = useState(false);

    const { loading: issuesLoading, error: issuesError, fn: fetchIssues, data: issues, setData: setIssues } = useFetch<DetailedIssue[], [string]>(getIssuesForSprint);
    const [filteredIssues, setFilteredIssues] = useState<DetailedIssue[] | null>(null);
    const { fn: updateIssueFn, loading: updateIssuesLoading } = useFetch(updateIssue);
    const { fn: assembleIssueFn, loading: assembleIssueLoading } = useFetch(processAssemblyDbUpdate);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);

    useEffect(() => {
        if (currentSprint?.id) fetchIssues(currentSprint.id);
    }, [currentSprint?.id]);

    useEffect(() => { setFilteredIssues(issues); }, [issues]);

    const handleFilterChange = (newFilteredIssues: DetailedIssue[]) => {
        setFilteredIssues(newFilteredIssues);
    };

    const handleIssueUpdate = (updatedItem: DetailedIssue | { id: string; deleted: boolean }) => {
        // If it was deleted/sold, remove it from the list
        if ('deleted' in updatedItem) {
            setIssues(prev => prev?.filter(i => i.id !== updatedItem.id) || null);
            return;
        }

        setIssues((prevIssues: DetailedIssue[] | null) => {
            if (!prevIssues) return null;

            const existingIndex = prevIssues.findIndex((i) => i.id === updatedItem.id);

            if (existingIndex !== -1) {
                // SCENARIO 1: Simple Update
                const newIssues = [...prevIssues];
                newIssues[existingIndex] = updatedItem;
                return newIssues;
            } else {
                // SCENARIO 2: A Split occurred
                return prevIssues.map((item) => {
                    // Reduce parent quantity locally
                    if (item.id === updatedItem.parentId) {
                        return {
                            ...item,
                            quantity: item.quantity - updatedItem.quantity,
                            isSplit: true,
                        };
                    }
                    return item;
                }).concat(updatedItem); // Add the new child issue
            }
        });
    };

    const onDragEnd = async (result: DropResult) => {
        if (currentSprint.status !== "ACTIVE" || isMobile || !issues) return;

        const { destination, source, draggableId } = result;

        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }

        // 1. Find the moved issue
        const movedIssue = issues.find(i => i.id === draggableId);
        if (!movedIssue) return;

        // 2. Optimistic Update (Local State)
        const destinationStatus = statuses.find(s => s.id === destination.droppableId);
        if (!destinationStatus) return;

        const updatedIssues = [...issues];
        const itemIdx = updatedIssues.findIndex(i => i.id === draggableId);

        // Update local object for immediate UI feedback
        updatedIssues[itemIdx] = {
            ...movedIssue,
            statusId: destination.droppableId,
            status: destinationStatus,
            track: [...(movedIssue.track || []), destination.droppableId]
        };

        setIssues(updatedIssues); // Real-time UI shift

        // 3. Selective Network Call
        // We call updateIssue directly for just ONE item instead of updateIssueOrder
        try {
            await updateIssueFn(draggableId, {
                status: destination.droppableId,
                priority: movedIssue.priority,
                assigneeId: movedIssue.assigneeId,
                track: [...(movedIssue.track || []), destination.droppableId],
                quantity: movedIssue.quantity // Dragging moves the full current quantity
            });
        } catch (err) {
            toast.error("Failed to sync status");
            setIssues(issues); // Rollback on error
        }
    };

    /**
 * Merges assembly items into a product, handling complex unit conversions.
 * Ensures that stock is deducted correctly based on Stock Unit vs Using Unit.
 */
    /**
     * Calculates the maximum possible units that can be assembled
     * and updates the filteredIssues by consuming those materials.
     */
    const Assemble = async (filteredIssues: DetailedIssue[]) => {
        // 1. Setup Status & Item IDs
        const assemblyStatusId = statuses.find((i) => i.key === "ASSEMBLY")?.id;
        const assemblyStatusObj = statuses.find((i) => i.id === assemblyStatusId);

        if (!assemblyStatusId || !assemblyStatusObj) {
            return toast.error("Assembly status configuration missing.");
        }

        const assemblyIssues = filteredIssues?.filter(
            (issue) => issue.statusId === assemblyStatusId
        ) || [];

        // 2. Yield Math
        const capacities = projectItems.map((itemDef) => {
            const totalStock = assemblyIssues
                .filter((issue) => issue.itemId === itemDef.id)
                .reduce((sum, issue) => sum + issue.quantity, 0);

            let factor = 1;
            if (itemDef.itemUnit === "KILOGRAM" && itemDef.usingUnit === "GRAM") factor = 1000;
            if (itemDef.itemUnit === "METERS" && itemDef.usingUnit === "INCHES") factor = 39.3701;
            if (itemDef.itemUnit === "TONNE" && itemDef.usingUnit === "KILOGRAM") factor = 1000;
            if (itemDef.itemUnit === "FEET" && itemDef.usingUnit === "INCHES") factor = 12;

            return {
                itemId: itemDef.id,
                maxPossible: Math.floor((totalStock * factor) / (itemDef.usingQuantity || 1)),
            };
        });

        const totalCanAssemble = Math.min(...capacities.map((c) => c.maxPossible));

        if (totalCanAssemble <= 0) {
            return toast.error("Insufficient materials to produce 1 unit.");
        }

        // 3. Local Consumption Logic
        let localMasterCopy = JSON.parse(JSON.stringify(issues || []));
        const toUpdate: { id: string; quantity: number }[] = [];
        const toDelete: string[] = [];

        projectItems.forEach((itemDef) => {
            let amountNeeded = totalCanAssemble * itemDef.usingQuantity;
            const batches = localMasterCopy.filter(
                (i: any) => i.itemId === itemDef.id && i.statusId === assemblyStatusId
            );

            for (let batch of batches) {
                if (amountNeeded <= 0) break;
                let factor = 1;
                if (itemDef.itemUnit === "KILOGRAM" && itemDef.usingUnit === "GRAM") factor = 1000;
                if (itemDef.itemUnit === "METERS" && itemDef.usingUnit === "INCHES") factor = 39.3701;

                let available = batch.quantity * factor;
                if (available > amountNeeded) {
                    batch.quantity -= amountNeeded / factor;
                    toUpdate.push({ id: batch.id, quantity: batch.quantity });
                    amountNeeded = 0;
                } else {
                    amountNeeded -= available;
                    batch.quantity = 0;
                    toDelete.push(batch.id);
                }
            }
        });

        // 4. Server Sync
        const sprintId = currentSprint.id;

        // Capture the return value of the useFetch function
        const result = await assembleIssueFn(
            toUpdate,
            toDelete,
            projectId,
            { quantityProduced: totalCanAssemble, sprintId },
            mainItemProduced,
            assemblyStatusId
        ) as any;

        // 5. State Reconciliation
        if (result?.success && result.data) {
            // HYDRATION: Ensure the new issue is fully formed for the Vision Pro UI
            const hydratedNewIssue = {
                ...result.data,
                item: result.data.item || mainItemProduced,
                status: result.data.status || assemblyStatusObj,
            };

            // A. Update Master Issues (Persistent state)
            setIssues((prev) => {
                if (!prev) return [hydratedNewIssue];
                const remaining = prev.filter((i) => !toDelete.includes(i.id));
                const updated = remaining.map((i) => {
                    const match = toUpdate.find((u) => u.id === i.id);
                    return match ? { ...i, quantity: match.quantity } : i;
                });
                return [...updated, hydratedNewIssue];
            });

            // B. Update Filtered View (Instant Kanban reflection)
            setFilteredIssues((prevFiltered) => {
                if (!prevFiltered) return [hydratedNewIssue];
                const remaining = prevFiltered.filter((i) => !toDelete.includes(i.id));
                const updated = remaining.map((i) => {
                    const match = toUpdate.find((u) => u.id === i.id);
                    return match ? { ...i, quantity: match.quantity } : i;
                }).filter(i => i.quantity > 0.0001); // Purge empty cards

                return [...updated, hydratedNewIssue];
            });

            toast.success(`Successfully assembled ${totalCanAssemble} products.`);
        } else {
            // If the code hits here, it means the server failed or result was null
            console.error("Assembly Sync Error:", result);
            toast.error(result?.error || "Failed to update board locally.");
        }
    };

    if (issuesError) {
        return (
            <div className="flex flex-col items-center justify-center h-96 text-center">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-sm font-medium text-gray-500">Unable to load issues</p>
            </div>
        );
    }

    return (
        <div className="space-y-12">
            {/* Sprint Manager */}
            {currentSprint && (
                <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-gray-100/50 p-6">
                    <SprintManager
                        sprint={currentSprint}
                        setSprint={setCurrentSprint}
                        sprints={sprints}
                        projectId={projectId}
                        orgUsers={orgUsers}
                    />
                </div>
            )}

            {/* Filters + Live Sync */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                {issues && !issuesLoading && <BoardFilters issues={issues} onFilterChange={handleFilterChange} />}
                <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
                    <CircleDot className="w-3 h-3 text-green-500 animate-pulse" />
                    Live sync active
                </div>
            </div>

            {(issuesLoading || updateIssuesLoading || assembleIssueLoading) && (
                <div className="py-4">
                    <BarLoader width="100%" color="#007AFF" height={2} />
                </div>
            )}

            {/* MAIN CONTENT */}
            {isMobile ? (
                /* Mobile: Only Table */
                // <IssuesTable />
                <Tabs defaultValue="table">
                    <TabsList className="inline-flex h-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                        <TabsTrigger value="table" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Table
                        </TabsTrigger>
                        <TabsTrigger value="cycle" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Life Cycle
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Inventory
                        </TabsTrigger>
                        <TabsTrigger value="calculator" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Calculator
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Production Logs
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="table">
                        {/* Overview Table */}
                        <IssuesTable statuses={statuses} filteredIssues={filteredIssues} />
                    </TabsContent>
                    <TabsContent value="cycle">
                        {/* Material LifeCycle */}
                        <IssueLifecycleDisplay statuses={statuses} filteredIssues={filteredIssues} />
                    </TabsContent>
                    <TabsContent value="inventory">
                        {/* Inventory */}
                        <Inventory statuses={statuses} filteredIssues={filteredIssues} mainItemProduced={mainItemProduced} />
                    </TabsContent>
                    <TabsContent value="calculator">
                        {/* Inventory */}
                        <Calculator statuses={statuses} filteredIssues={filteredIssues} projectItems={projectItems} />
                    </TabsContent>
                    <TabsContent value="logs">
                        <ProductionLogs sprintId={currentSprint.id} />
                    </TabsContent>
                </Tabs>
            ) : (
                <Tabs defaultValue="kanban">
                    <TabsList className="inline-flex h-11 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 p-1">
                        <TabsTrigger value="kanban" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Kanban
                        </TabsTrigger>
                        <TabsTrigger value="table" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Table
                        </TabsTrigger>
                        <TabsTrigger value="cycle" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Material Life Cycle
                        </TabsTrigger>
                        <TabsTrigger value="inventory" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Inventory
                        </TabsTrigger>
                        <TabsTrigger value="calculator" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Calculator
                        </TabsTrigger>
                        <TabsTrigger value="logs" className="px-7 py-2 text-sm font-medium rounded-full data-[state=active]:bg-black data-[state=active]:text-white dark:data-[state=active]:bg-white dark:data-[state=active]:text-black transition-all">
                            Production logs
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="kanban">
                        {/* Kanban Board */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Board View</h2>
                            <div className="overflow-x-auto pb-6 -mx-6 px-6">
                                <div className="inline-flex gap-8 min-w-max">
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        {statuses.map((column) => {
                                            const columnIssues = filteredIssues?.filter(i => i && i.statusId === column.id) || [];
                                            return (
                                                <div key={column.key} className="w-80 shrink-0">
                                                    <div className="flex items-center justify-between mb-5">
                                                        <h3 className="text-sm font-semibold text-gray-900">
                                                            {column.name}
                                                            <span className="ml-2 text-xs font-medium text-gray-500">
                                                                {columnIssues.length}
                                                            </span>
                                                        </h3>
                                                        {column.key === "TODO" && currentSprint?.status !== "COMPLETED" && (
                                                            <Button
                                                                onClick={() => {
                                                                    setSelectedStatus(column.id as IssueType['statusId']);
                                                                    setIsDrawerOpen(true);
                                                                }}
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-9 w-9 rounded-xl hover:bg-gray-100"
                                                            >
                                                                <Plus className="h-5 w-5" />
                                                            </Button>
                                                        )}
                                                        {column.key === "ASSEMBLY" && currentSprint?.status !== "COMPLETED" && (
                                                            <Button
                                                                onClick={() => {
                                                                    Assemble(filteredIssues || [])
                                                                }}
                                                                size="icon"
                                                                variant="ghost"
                                                                className="h-9 w-9 rounded-xl hover:bg-gray-100"
                                                                title="Assemble"
                                                            >
                                                                <MergeIcon className="h-5 w-5" />
                                                            </Button>
                                                        )}
                                                    </div>

                                                    <Droppable droppableId={column.id}>
                                                        {(provided, snapshot) => (
                                                            <div
                                                                ref={provided.innerRef}
                                                                {...provided.droppableProps}
                                                                className={`min-h-96 rounded-3xl p-4 transition-all duration-200 bg-gray-50/70
                                                                ${snapshot.isDraggingOver ? "bg-[#FFF0EA]/40 border-2 border-dashed border-[#FF7A5C]/20" : "bg-[#FAF9F6]/40"}`}
                                                            >
                                                                <div className="space-y-3">
                                                                    {columnIssues.map((issue, index) => (
                                                                        <Draggable
                                                                            key={issue.id}
                                                                            draggableId={issue.id}
                                                                            index={index}
                                                                            isDragDisabled={updateIssuesLoading}
                                                                        >
                                                                            {(provided, snapshot) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    {...provided.dragHandleProps}
                                                                                    className={`transition-all ${snapshot.isDragging ? "scale-105 rotate-3" : ""}`}
                                                                                >
                                                                                    <IssueCard
                                                                                        issue={issue}
                                                                                        onDelete={() => currentSprint?.id && fetchIssues(currentSprint.id)}
                                                                                        onUpdate={handleIssueUpdate}
                                                                                        statuses={statuses}
                                                                                        orgUsers={orgUsers}
                                                                                    />
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </Droppable>
                                                </div>
                                            );
                                        })}
                                    </DragDropContext>
                                </div>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="table">
                        {/* Overview Table */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-5">All Issues</h2>
                            <IssuesTable statuses={statuses} filteredIssues={filteredIssues} />
                        </div>
                    </TabsContent>
                    <TabsContent value="cycle">
                        {/* Material LifeCycle */}
                        <IssueLifecycleDisplay statuses={statuses} filteredIssues={filteredIssues} />
                    </TabsContent>
                    <TabsContent value="inventory">
                        {/* Inventory dashbaord */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-5">Inventory</h2>
                            <Inventory statuses={statuses} filteredIssues={filteredIssues} mainItemProduced={mainItemProduced} />
                        </div>
                    </TabsContent>
                    <TabsContent value="calculator">
                        {/* Inventory dashbaord */}
                        {/* <div> */}
                        {/* <h2 className="text-lg font-semibold text-gray-900 mb-5">Calculator</h2> */}
                        <Calculator statuses={statuses} filteredIssues={filteredIssues} projectItems={projectItems} />
                        {/* </div> */}
                    </TabsContent>
                    <TabsContent value="logs">
                        <ProductionLogs sprintId={currentSprint.id} />
                    </TabsContent>
                </Tabs>

            )}

            {/* Floating + Button (iOS-style) */}
            {currentSprint && currentSprint.status !== "COMPLETED" && (
                <Button
                    onClick={() => {
                        setSelectedStatus(statuses[0]['id']);
                        setIsDrawerOpen(true);
                    }}
                    size="icon"
                    className="fixed bottom-8 right-6 h-14 w-14 rounded-full shadow-2xl bg-blue-600 hover:bg-blue-700 text-white text-3xl font-light z-50 flex items-center justify-center"
                >
                    +
                </Button>
            )}

            {/* Drawer */}
            {currentSprint && (
                <IssueCreationDrawer
                    isOpen={isDrawerOpen}
                    onClose={() => setIsDrawerOpen(false)}
                    sprintId={currentSprint.id}
                    status={selectedStatus}
                    projectId={projectId}
                    projectItems={projectItems}
                    onIssueCreated={() => fetchIssues(currentSprint.id)}
                    orgId={orgId}
                    orgUsers={orgUsers}
                />
            )}
        </div>
    );
};

export default SprintBoard;