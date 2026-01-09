'use client'

import { DragDropContext, Draggable, Droppable, DropResult } from "@hello-pangea/dnd";
import IssueCreationDrawer from "./create-issue";
import React, { useEffect, useState } from "react";
import SprintManager from "./sprint-manager";
import statuses from "@/data/status.json";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import { getIssuesForSprint, updateIssueOrder } from "@/actions/issues";
import { BarLoader } from "react-spinners";
import IssueCard from "@/components/issue-card";
import { toast } from "sonner";
import BoardFilters from "./board-filters";
import { Plus, CircleDot, ChevronRight, RotateCcw, Activity, ArrowRight } from "lucide-react";
import { IssueType, ProjectType, SprintType, UserType } from "@/lib/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type DetailedIssue = IssueType & {
    project?: ProjectType;
    assignee: UserType | null;
    reporter: UserType;
};

type Props = {
    sprints: SprintType[],
    projectId: ProjectType['id'],
    orgId: ProjectType['organizationId']
}

const SprintBoard = ({ sprints, projectId, orgId }: Props) => {
    const [currentSprint, setCurrentSprint] = useState<SprintType>(
        sprints.find((spr) => spr.status === "ACTIVE") || sprints[0]
    );
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState<IssueType['status']>("TODO");
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
        const newIssues: DetailedIssue[] = [...issues];
    
        // Filter issues by column
        const sourceItems = newIssues.filter((i) => i.status === source.droppableId);
        const destItems = newIssues.filter((i) => i.status === destination.droppableId);
    
        // 4. Movement Logic
        if (source.droppableId === destination.droppableId) {
            // REORDERING (Same Column)
            const reordered = Array.from(sourceItems);
            const [removed] = reordered.splice(source.index, 1);
            reordered.splice(destination.index, 0, removed);
            
            // Update local order indices
            reordered.forEach((item, idx) => {
                item.order = idx;
            });
        } else {
            // MOVING (Cross Column)
            const [movedItem] = sourceItems.splice(source.index, 1);
            
            const newStatus = destination.droppableId as DetailedIssue["status"];
    
            // Logic: Update status AND append to history track
            movedItem.status = newStatus;
            
            // Append the new status to the track array
            // We ensure track is initialized if it's somehow null/undefined
            movedItem.track = [...(movedItem.track || []), newStatus];
    
            destItems.splice(destination.index, 0, movedItem);
    
            // Re-index both affected columns
            sourceItems.forEach((item, i) => (item.order = i));
            destItems.forEach((item, i) => (item.order = i));
        }
    
        // 5. Reconstruct the full list
        // We map through original issues and replace the ones that were in the affected columns
        const updated = newIssues.map((item) => {
            const found = [...sourceItems, ...destItems].find((i) => i.id === item.id);
            return found ? { ...found } : item;
        });
    
        // 6. Update State & DB
        // Maintain the "Vision Pro" sorting for the lens/filter bar
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

    // Shared Table Component (used on both mobile and large screens)
    const IssuesTable = () => (
        <div className="rounded-3xl overflow-hidden bg-white/70 backdrop-blur-2xl  border border-white/50">
            <div className="overflow-x-auto">
                <table className="w-full min-w-175">
                    {/* Header */}
                    <thead>
                        <tr className="border-b border-gray-200/50">
                            <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                Issue
                            </th>
                            <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                Status
                            </th>
                            <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                Priority
                            </th>
                            <th className="text-left px-8 py-2 text-sm font-semibold text-gray-600 uppercase tracking-wide">
                                Assignee
                            </th>
                        </tr>
                    </thead>

                    {/* Body */}
                    <tbody className="divide-y divide-gray-100/60">
                        {filteredIssues && filteredIssues.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="py-4 text-center">
                                    <div className="max-w-md mx-auto">
                                        <div className="text-7xl mb-6 text-gray-150">📂</div>
                                        <p className="text-xl font-medium text-gray-700">All clear</p>
                                        <p className="text-base text-gray-500 mt-3">
                                            No issues in this sprint yet. Create one to get started.
                                        </p>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            filteredIssues?.map((issue) => (
                                <tr
                                    key={issue.id}
                                    className="hover:bg-white/40 transition-all duration-300"
                                >
                                    {/* Issue Title */}
                                    <td className="px-8 py-6">
                                        <div className="text-base font-medium text-gray-900 leading-snug">
                                            {issue.title}
                                        </div>
                                    </td>

                                    {/* Status – Apple-style soft pill */}
                                    <td className="px-8 py-6">
                                        <div
                                            className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium transition-all
                            ${issue.status === "SALES"
                                                    ? "bg-green-100/80 text-green-700"
                                                    : issue.status === "PURCHASE"
                                                        ? "bg-blue-100/80 text-blue-700"
                                                        : issue.status === "TODO"
                                                            ? "bg-purple-100/80 text-purple-700"
                                                            : "bg-gray-100/80 text-gray-700"
                                                }`}
                                        >
                                            {statuses.find((s) => s.key === issue.status)?.name || issue.status}
                                        </div>
                                    </td>

                                    {/* Priority – Clean dot + text */}
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-2.5">
                                            <div
                                                className={`w-2.5 h-2.5 rounded-full
                              ${issue.priority === "URGENT" ? "bg-red-500" :
                                                        issue.priority === "HIGH" ? "bg-orange-500" :
                                                            issue.priority === "MEDIUM" ? "bg-amber-500" :
                                                                "bg-green-500"}`}
                                            />
                                            <span className="text-sm font-medium text-gray-700">
                                                {issue.priority}
                                            </span>
                                        </div>
                                    </td>

                                    {/* Assignee – Elegant avatar + name */}
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            {issue.assignee ? (
                                                <>
                                                    <div className="relative">

                                                        <Avatar className="h-8 w-8 border border-white/10 rounded-full"><AvatarImage src={issue.assignee.profileImageUrl || ""} /><AvatarFallback className="bg-white font-black">{issue.assignee.name?.[0]}</AvatarFallback></Avatar>

                                                        <div className="absolute inset-0 rounded-2xl ring-4 ring-white/60" />
                                                    </div>
                                                    <span className="font-medium text-gray-800">
                                                        {issue.assignee.name}
                                                    </span>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="w-10 h-10 rounded-2xl bg-gray-200/70 flex items-center justify-center">
                                                        <span className="text-gray-400 text-lg">◦</span>
                                                    </div>
                                                    <span className="text-gray-500 font-medium">Unassigned</span>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // shared tracking component of life cycle

    const IssueLifecycleDisplay = () => {
        const MASTER_SEQUENCE = [
            "TODO", "PURCHASE", "STORE", "BUFFING",
            "PAINTING", "WINDING", "ASSEMBLY", "PACKING", "SALES"
        ];

        return (
            <div className="p-2 font-sans text-[#3D3D3D]">
                <div className="fixed inset-0 overflow-hidden pointer-events-none">
                    <div className="absolute top-[-5%] right-[-5%] w-[35%] h-[35%] bg-[#FCEEE9] rounded-full blur-[120px] opacity-40" />
                </div>

                <div className="relative z-10 max-w-full mx-auto space-y-11">
                    {filteredIssues && filteredIssues.length === 0 ? (
                        <div className="p-20 text-center bg-white/60 backdrop-blur-xl rounded-[2.5rem] border border-black/3 shadow-sm">
                            <p className="text-black/30 font-medium tracking-tight italic">Inventory track is empty.</p>
                        </div>
                    ) : (
                        filteredIssues?.map((issue) => {
                            const trackHistory = issue.track ?? [];

                            return (
                                <div key={issue.id} className="animate-in fade-in slide-in-from-bottom-2 duration-700">
                                    <div className="flex items-end justify-between px-4 mb-2">
                                        <div className="space-y-1">
                                            <h2 className="text-2xl font-semibold tracking-tight text-[#1D1D1F]">
                                                {issue.title}
                                            </h2>
                                        </div>
                                    </div>
                                    <div className="relative p-2 rounded-[2.5rem] bg-white/40 backdrop-blur-2xl border border-white shadow-[0_20px_40px_rgba(0,0,0,0.03)] overflow-x-auto no-scrollbar">
                                        <div className="flex items-center p-2 gap-2 min-w-max">
                                            {trackHistory.map((status, idx) => {
                                                const isLast = idx === trackHistory.length - 1;
                                                const isRepeat = trackHistory.slice(0, idx).includes(status);
                                                const seqOrder = MASTER_SEQUENCE.indexOf(status) + 1;

                                                return (
                                                    <div key={`${status}-${idx}`} className="flex items-center gap-3">
                                                        <div className={`
                                  relative min-w-47.5 p-2 rounded-[1.8rem] transition-all duration-500
                                  border shadow-sm
                                  ${isLast
                                                                ? 'bg-white border-[#F2E8E4] scale-105 z-20 shadow-[0_12px_24px_rgba(0,0,0,0.05)]'
                                                                : isRepeat
                                                                    ? 'bg-[#FDFBF9] border-[#EAE2DF]'
                                                                    : 'bg-white/40 border-transparent hover:border-black/5'}
                                `}>

                                                            {/* Entry Indicator */}
                                                            <div className="flex justify-between items-center mb-4">
                                                                <span className={`text-[9px] font-black tracking-widest ${isLast ? 'text-[#FF7A51]' : 'text-black/20'}`}>
                                                                    STEP {idx + 1}
                                                                </span>
                                                                {isRepeat && (
                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 bg-[#FFF4F0] rounded-md border border-[#FCEEE9]">
                                                                        <RotateCcw size={10} className="text-[#FF7A51]" />
                                                                        <span className="text-[8px] font-bold text-[#FF7A51]">REVISIT</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <h3 className={`text-[13px] font-bold tracking-tight uppercase mb-1 ${isLast ? 'text-black' : 'text-black/60'}`}>
                                                                {status}
                                                            </h3>
                                                            <div className="flex items-center gap-1.5">
                                                                <div className={`w-1 h-1 rounded-full ${isLast ? 'bg-[#FF7A51]' : 'bg-black/10'}`} />
                                                                <span className="text-[10px] font-medium text-black/30">
                                                                    Phase {seqOrder}
                                                                </span>
                                                            </div>
                                                            {isLast && (
                                                                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF7A51] rounded-full blur-[2px]" />
                                                            )}
                                                        </div>
                                                        {!isLast && (
                                                            <ArrowRight className="text-black shrink-0" size={16} strokeWidth={1.5} />
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* UX Summary Bar */}
                                    <div className="mt-5 px-6 flex items-center justify-between">
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2 group">
                                                <div className="w-2 h-2 rounded-full bg-[#FF7A51] group-hover:animate-ping" />
                                                <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Active Processing</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Activity size={12} className="text-black/20" />
                                                <span className="text-[10px] font-bold text-black/40 uppercase tracking-widest">{trackHistory.length} Movement Logs</span>
                                            </div>
                                        </div>

                                        <div className="text-[10px] font-medium text-black/30 italic">
                                            Sequential tracking enabled
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };


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
                            Material Life Cycle
                        </TabsTrigger>
                    </TabsList>
                    <TabsContent value="table">
                        {/* Overview Table */}
                        <IssuesTable />
                    </TabsContent>
                    <TabsContent value="cycle">
                        {/* Material LifeCycle */}
                        <IssueLifecycleDisplay />
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
                    </TabsList>
                    <TabsContent value="kanban">
                        {/* Kanban Board */}
                        <div>
                            <h2 className="text-lg font-semibold text-gray-900 mb-6">Board View</h2>
                            <div className="overflow-x-auto pb-6 -mx-6 px-6">
                                <div className="inline-flex gap-8 min-w-max">
                                    <DragDropContext onDragEnd={onDragEnd}>
                                        {statuses.map((column) => {
                                            const columnIssues = filteredIssues?.filter(i => i.status === column.key) || [];
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
                                                                    setSelectedStatus(column.key as IssueType['status']);
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

                                                    <Droppable droppableId={column.key}>
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
                                                                                        onUpdate={(updated) => setIssues(prev => prev?.map(i => i.id === updated.id ? { ...i, ...updated } : i) || [])}
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
                            <IssuesTable />
                        </div>
                    </TabsContent>
                    <TabsContent value="cycle">
                        {/* Material LifeCycle */}
                        <IssueLifecycleDisplay />
                    </TabsContent>
                </Tabs>

            )}

            {/* Floating + Button (iOS-style) */}
            {currentSprint && currentSprint.status !== "COMPLETED" && (
                <Button
                    onClick={() => {
                        setSelectedStatus("TODO");
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