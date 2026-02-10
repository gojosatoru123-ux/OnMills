"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import MDEditor from "@uiw/react-md-editor";
import UserAvatar from "./user-avatar";
import useFetch from "@/hooks/use-fetch";
import { useOrganization, useUser } from "@clerk/nextjs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { BarLoader } from "react-spinners";
import { ExternalLink } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";

import { deleteIssue, updateIssue } from "@/actions/issues";
import { DetailedIssue, IssueType, ProjectStatusType, UserType } from "@/lib/types";
import { getOrganizationUsers } from "@/actions/organization";
import { Input } from "./ui/input";
import { toast } from "sonner";

const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Props = {
    isOpen: boolean;
    onClose: () => void;
    issue: DetailedIssue;
    onDelete?: () => void;
    onUpdate?: (updated: DetailedIssue) => void;
    borderCol?: string;
    statuses: ProjectStatusType[];
}

export default function IssueDetailsDialog({
    isOpen,
    onClose,
    issue,
    onDelete = () => { },
    onUpdate = () => { },
    borderCol = "",
    statuses
}: Props) {
    const [status, setStatus] = useState(issue.statusId);
    const [statusName, setStatusName] = useState(issue.status.name)
    const [priority, setPriority] = useState(issue.priority);
    const [assigneeId, setAssigneeId] = useState(issue.assigneeId);
    const [quantity, setQuantity] = useState<number>(issue.quantity);
    const [track, setTrack] = useState(issue.track);

    // New states for confirmation popups
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);

    const { user } = useUser();
    const { organization, membership } = useOrganization();
    const router = useRouter();
    const pathname = usePathname();

    const {
        loading: deleteLoading,
        error: deleteError,
        fn: deleteIssueFn,
        data: deleted,
    } = useFetch(deleteIssue);

    const {
        loading: updateLoading,
        error: updateError,
        fn: updateIssueFn,
        data: updated,
    } = useFetch(updateIssue);

    const { loading: gettingOrganizationUserLoading, fn: fetchUsers, data: users } = useFetch(getOrganizationUsers);

    // Handlers for confirmation
    const handleDeleteConfirm = async () => {
        deleteIssueFn(issue.id);
        setIsDeleteDialogOpen(false);
    };

    const handleSellConfirm = async () => {
        // According to your server logic, status 'SALES' triggers the sale/consumption
        const saleStatus = 'SALES'
        const newTrack = [...track, saleStatus];
        if(quantity > issue.quantity){
            toast.error("Insufficient quantity available in this batch.");
            return
        }
        if(quantity == 0){
            toast.error("Quantity must be at least 1.");
            return
        }
        updateIssueFn(issue.id, {
            status: saleStatus,
            priority,
            assigneeId,
            track: newTrack,
            quantity
        });

        setIsSellDialogOpen(false);
    };

    const handleStatusChange = async (newStatus: IssueType['statusId']) => {
        setStatus(newStatus);
        const newTrack = [...track, newStatus];
        setTrack(newTrack);
        updateIssueFn(issue.id, { status: newStatus, priority, assigneeId, track: newTrack, quantity });
    };

    const handlePriorityChange = async (newPriority: IssueType['priority']) => {
        setPriority(newPriority);
        updateIssueFn(issue.id, { status, priority: newPriority, assigneeId, track, quantity });
    };

    const handleAssigneeChange = async (newAssigneeId: UserType['id']) => {
        setAssigneeId(newAssigneeId);
        updateIssueFn(issue.id, { status, priority, assigneeId: newAssigneeId, track, quantity });
    }

    useEffect(() => {
        if (isOpen && organization?.id) {
            fetchUsers(organization?.id);
        }
    }, [isOpen, organization?.id])

    useEffect(() => {
        // Handle post-update/delete logic
        if (deleted || (updated && 'deleted' in updated)) {
            onClose();
            onDelete();
        } else if (updated) {
            // updated is likely IssueType (flat)
            // We need to transform it back to DetailedIssue for the parent state
            
            // 1. Find the current status object from the prop
            const currentStatusObject = statuses.find(s => s.id === updated.statusId);
            
            if (currentStatusObject) {
                // 2. Reconstruct the DetailedIssue shape
                const reconstructedIssue: DetailedIssue = {
                    ...issue,        // Keep existing nested objects (item, reporter, project, etc.)
                    ...updated,      // Overwrite with fresh data from server (statusId, priority, etc.)
                    status: currentStatusObject // Explicitly set the status object TypeScript is looking for
                };
                
                onUpdate(reconstructedIssue);
            } else {
                // Fallback if status isn't found (though it should be)
                onUpdate(updated as unknown as DetailedIssue);
            }
        }
    }, [deleted, updated, statuses]); // Add statuses to dependency array

    const canChange = membership?.role === "org:admin"

    const handleGoToProject = () => {
        router.push(`/project/${issue.projectId}?sprint=${issue.sprintId}`);
    };

    const isProjectPage = !pathname.startsWith("/project/");

    return (
        <>
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent>
                    <DialogHeader>
                        <div className="flex justify-between items-center">
                            <DialogTitle className="text-3xl">{issue.item.name}</DialogTitle>
                            {isProjectPage && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleGoToProject}
                                    title="Go to Project"
                                >
                                    <ExternalLink className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                    </DialogHeader>
                    {(updateLoading || deleteLoading || gettingOrganizationUserLoading) && (
                        <BarLoader width={"100%"} color="#36d7b7" />
                    )}
                    {issue.project?.name && (
                        <p className="text-sm font-medium text-gray-600 mt-2">
                            Project : {issue.project.name}
                        </p>
                    )}
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                    Status
                                </label>
                                <Select value={status} onValueChange={handleStatusChange}>
                                    <SelectTrigger className="w-full h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {statuses.map((option) => (
                                            <SelectItem key={option.key} value={option.id}>
                                                {option.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                    Priority
                                </label>
                                <Select
                                    value={priority}
                                    onValueChange={handlePriorityChange}
                                    disabled={!canChange}
                                >
                                    <SelectTrigger className={`w-full h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${!canChange ? "opacity-70 cursor-not-allowed" : ""
                                        }`}>
                                        <SelectValue placeholder="Priority" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {priorityOptions.map((option) => (
                                            <SelectItem key={option} value={option}>
                                                {option}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 block">
                                    Quantity
                                </label>
                                <div className="flex justify-center items-center gap-2">
                                    <Input value={quantity} type="number" max={issue.quantity} min={1} onChange={(e) => {
                                        const val = e.target.value;
                                        setQuantity(val === "" ? 0 : Number(val));
                                    }} />
                                    <span>{issue.item.itemUnit}</span>
                                </div>
                            </div>

                            {statusName === 'SALES' && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-400 dark:text-gray-300 mb-2 block">
                                        Sell item and update
                                    </label>
                                    <div>
                                        <Button
                                            variant={'outline'}
                                            className="cursor-pointer"
                                            onClick={() => setIsSellDialogOpen(true)}
                                        >
                                            Sell Item
                                        </Button>
                                    </div>
                                </div>
                            )}

                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                                Description
                            </h4>
                            <div className="prose prose-sm dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-800/50 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                                <MDEditor.Markdown className="bg-transparent! text-slate-700!  max-w-none 
                         selection:bg-amber-200/50"
                                    source={issue.description || "_No description provided._"}
                                />
                            </div>
                        </div>
                        <div className="flex justify-between">
                            <div className="flex flex-col gap-2">
                                <h4 className="font-semibold">Assignee</h4>
                                <Select value={assigneeId || undefined} onValueChange={handleAssigneeChange}>
                                    <SelectTrigger className="w-full h-11 rounded-lg border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                                        <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {users?.map((option) => (
                                            <SelectItem key={option.id} value={option.id}>
                                                <UserAvatar user={option} />
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <h4 className="font-semibold">Reporter</h4>
                                <UserAvatar user={issue.reporter} />
                            </div>
                        </div>
                        {canChange && (
                            <Button
                                onClick={() => setIsDeleteDialogOpen(true)}
                                disabled={deleteLoading}
                                variant="destructive"
                            >
                                {deleteLoading ? "Deleting..." : "Delete Issue"}
                            </Button>
                        )}
                        {(deleteError || updateError) && (
                            <p className="text-red-500">
                                Error occured
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Popup */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Delete Issue</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this issue? This action cannot be unSALES.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDeleteConfirm}>Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Sell Confirmation Popup */}
            <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
                <DialogContent className="sm:max-w-106.25">
                    <DialogHeader>
                        <DialogTitle>Confirm Sale</DialogTitle>
                        <DialogDescription>
                            Do you want to process the sale for {quantity} {issue.item.itemUnit} of this item?
                            {quantity === issue.quantity ? " This will remove the item from active list." : ""}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsSellDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleSellConfirm}>Confirm Sale</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}