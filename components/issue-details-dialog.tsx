"use client";

import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
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

import statuses from "@/data/status.json";
import { deleteIssue, updateIssue } from "@/actions/issues";
import { IssueType, UserType } from "@/lib/types";
import { DetailedIssue } from "@/app/(main)/project/_components/sprint-board";

const priorityOptions = ["LOW", "MEDIUM", "HIGH", "URGENT"];

type Props = {
    isOpen: boolean;
    onClose: () => void;
    issue: DetailedIssue;
    onDelete?: () => void;
    onUpdate?: (updated: IssueType) => void;
    borderCol?: string;
}

export default function IssueDetailsDialog({
    isOpen,
    onClose,
    issue,
    onDelete = () => { },
    onUpdate = () => { },
    borderCol = "",
}: Props) {
    const [status, setStatus] = useState(issue.status);
    const [priority, setPriority] = useState(issue.priority);
    const { user } = useUser();
    const { membership } = useOrganization();
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

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this issue?")) {
            deleteIssueFn(issue.id);
        }
    };

    const handleStatusChange = async (newStatus: IssueType['status']) => {
        setStatus(newStatus);
        updateIssueFn(issue.id, { status: newStatus, priority });
    };

    const handlePriorityChange = async (newPriority: IssueType['priority']) => {
        setPriority(newPriority);
        updateIssueFn(issue.id, { status, priority: newPriority });
    };

    useEffect(() => {
        if (deleted) {
            onClose();
            onDelete();
        }
        if (updated) {
            onUpdate(updated);
        }
    }, [deleted, updated, deleteLoading, updateLoading]);

    const canChange = membership?.role === "org:admin"
    // user.id === issue.reporter.clerkUserId || membership.role === "org:admin";

    const handleGoToProject = () => {
        router.push(`/project/${issue.projectId}?sprint=${issue.sprintId}`);
    };

    const isProjectPage = !pathname.startsWith("/project/");

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <div className="flex justify-between items-center">
                        <DialogTitle className="text-3xl">{issue.title}</DialogTitle>
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
                {(updateLoading || deleteLoading) && (
                    <BarLoader width={"100%"} color="#36d7b7" />
                )}
                {issue.project?.name && (
                    <p className="text-sm font-medium text-gray-600 mt-2">
                        Project : {issue.project.name}
                    </p>
                )}                <div className="space-y-4">
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
                                        <SelectItem key={option.key} value={option.key}>
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
                            <UserAvatar user={issue.assignee} />
                        </div>
                        <div className="flex flex-col gap-2">
                            <h4 className="font-semibold">Reporter</h4>
                            <UserAvatar user={issue.reporter} />
                        </div>
                    </div>
                    {canChange && (
                        <Button
                            onClick={handleDelete}
                            disabled={deleteLoading}
                            variant="destructive"
                        >
                            {deleteLoading ? "Deleting..." : "Delete Issue"}
                        </Button>
                    )}
                    {(deleteError || updateError) && (
                        <p className="text-red-500">
                            {/* {deleteError?.message || updateError?.message} */}
                            Error occured
                        </p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}