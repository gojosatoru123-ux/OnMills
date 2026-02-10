'use client'

import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import IssueCreationDrawer from "./create-issue";
import React, { useEffect, useState } from "react";
import SprintManager from "./sprint-manager";
// import statuses from "@/data/status.json";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import { getIssuesForSprint, updateIssueOrder } from "@/actions/issues";
import { BarLoader } from "react-spinners";
import IssueCard from "@/components/issue-card";
import { toast } from "sonner";
import BoardFilters from "./board-filters";
import { Plus, CircleDot } from "lucide-react";
import { DetailedIssue, IssueType, ItemType, ProjectStatusType, ProjectType, SprintType, UserType } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import IssuesTable from "@/components/issues-table";
import IssueLifecycleDisplay from "@/components/issue-lifecycle-display";
import Inventory from "@/components/inventory";
import Calculator from "@/components/calculator";



type Props = {
    sprints: SprintType[],
    projectId: ProjectType['id'],
    orgId: ProjectType['organizationId']
    statuses: ProjectStatusType[]
    projectItems: ItemType[]
}

const SprintBoard = ({ sprints, projectId, orgId, statuses, projectItems }: Props) => {
    const [currentSprint, setCurrentSprint] = useState<SprintType>(
        sprints.find((spr) => spr.status === "ACTIVE") || sprints[0]
    );
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<IssueType['statusId']>(statuses[0]["id"]);
    const [isMobile, setIsMobile] = useState(false);

    const { loading: issuesLoading, error: issuesError, fn: fetchIssues, data: issues, setData: setIssues } = useFetch<DetailedIssue[], [string]>(getIssuesForSprint);
    const [filteredIssues, setFilteredIssues] = useState<DetailedIssue[] | null>(null);
    const { fn: updateIssueOrderFn, loading: updateIssuesLoading } = useFetch<any, [DetailedIssue[]]>(updateIssueOrder);

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

    const handleIssueUpdate = (updatedItem: DetailedIssue) => {
        setIssues((prevIssues: DetailedIssue[] | null) => {
            if (!prevIssues) return null;
    
            // Check if this is an update to an existing card or a brand new one (split)
            const existingIndex = prevIssues.findIndex((i) => i.id === updatedItem.id);
    
            if (existingIndex !== -1) {
                // SCENARIO 1: Simple Update
                const newIssues = [...prevIssues];
                newIssues[existingIndex] = updatedItem;
                return newIssues;
            } else {
                // SCENARIO 2: A Split occurred
                // 1. Find the parent issue and decrease its quantity locally
                // 2. Add the brand-new issue (the split-off part) to the list
                const updatedWithParent = prevIssues.map((item) => {
                    if (item.id === updatedItem.parentId) {
                        return {
                            ...item,
                            quantity: item.quantity - updatedItem.quantity,
                            isSplit: true,
                        };
                    }
                    return item;
                });
    
                return [...updatedWithParent, updatedItem];
            }
        });
        
        // Refresh server data in background to keep stats in sync
        // router.refresh();
    };

    const onDragEnd = async (result: DropResult) => {
        // 1. Sprint Status Guards
        if (currentSprint.status === "PLANNED") {
            toast.warning("Start the sprint to update board");
            return;
        }
        if (currentSprint.status === "COMPLETED") {
            toast.warning("Cannot update board after sprint end");
            return;
        }
    
        // 2. Early Exits
        if (isMobile || !currentSprint || !issues) return;
    
        const { destination, source } = result;
    
        if (
            !destination ||
            (destination.droppableId === source.droppableId && destination.index === source.index)
        ) {
            return;
        }
    
        // 3. Create a deep copy for manipulation
        // Note: We use map to ensure we have a fresh array of objects to avoid mutating state directly
        const newIssues: DetailedIssue[] = [...issues];
    
        // Filter issues by column
        const sourceItems = newIssues.filter((i) => i.statusId === source.droppableId);
        const destItems = newIssues.filter((i) => i.statusId === destination.droppableId);
    
        // 4. Movement Logic
        if (source.droppableId === destination.droppableId) {
            // REORDERING (Same Column)
            const [removed] = sourceItems.splice(source.index, 1);
            sourceItems.splice(destination.index, 0, removed);
    
            // Update local order indices
            sourceItems.forEach((item, idx) => {
                item.order = idx;
            });
        } else {
            // MOVING (Cross Column)
            const [movedItem] = sourceItems.splice(source.index, 1);
            
            // FIX: Find the actual status object for the destination column
            // Assuming 'projectStatuses' is available in your component scope
            const destinationStatus = statuses.find(s => s.id === destination.droppableId);
    
            if (!destinationStatus) {
                console.error("Destination status not found");
                return;
            }
    
            // Logic: Update the Foreign Key ID AND the full Status Object
            movedItem.statusId = destination.droppableId;
            movedItem.status = destinationStatus; // This satisfies the 'DetailedIssue' type
    
            // Append the new status ID to the track history array
            movedItem.track = [...(movedItem.track || []), destination.droppableId];
    
            destItems.splice(destination.index, 0, movedItem);
    
            // Re-index both affected columns
            sourceItems.forEach((item, i) => (item.order = i));
            destItems.forEach((item, i) => (item.order = i));
        }
    
        // 5. Reconstruct the full list
        // Ensure the mapped array is explicitly typed as DetailedIssue[]
        const updated: DetailedIssue[] = newIssues.map((item) => {
            const found = [...sourceItems, ...destItems].find((i) => i.id === item.id);
            return found ? { ...found } : item;
        });
    
        // 6. Update State & DB
        const sortedUpdated = updated.sort((a, b) => a.order - b.order);
    
        setIssues(sortedUpdated);
        updateIssueOrderFn(sortedUpdated);
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

            {(issuesLoading || updateIssuesLoading) && (
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
                        <Inventory  statuses={statuses} filteredIssues={filteredIssues} />
                    </TabsContent>
                    <TabsContent value="calculator">
                        {/* Inventory */}
                        <Calculator  statuses={statuses} filteredIssues={filteredIssues} projectItems={projectItems} />
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
                    </TabsList>
                    <TabsContent value="kanban">
                        {/* Kanban Board */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Board View</h2>
                            <div className="overflow-x-auto pb-6 -mx-6 px-6">
                                <div className="inline-flex gap-8 min-w-max">
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        {statuses.map((column) => {
                                            const columnIssues = filteredIssues?.filter(i => i.statusId === column.id) || [];
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
                                                                                        statuses = {statuses}
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
                            <Inventory statuses={statuses} filteredIssues={filteredIssues} />
                        </div>
                    </TabsContent>
                    <TabsContent value="calculator">
                        {/* Inventory dashbaord */}
                        {/* <div> */}
                            {/* <h2 className="text-lg font-semibold text-gray-900 mb-5">Calculator</h2> */}
                            <Calculator statuses={statuses} filteredIssues={filteredIssues} projectItems={projectItems} />
                        {/* </div> */}
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
                    onIssueCreated={() => fetchIssues(currentSprint.id)}
                    orgId={orgId}
                />
            )}
        </div>
    );
};

export default SprintBoard;