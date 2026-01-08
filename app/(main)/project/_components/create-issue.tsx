"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import MDEditor from "@uiw/react-md-editor";
import useFetch from "@/hooks/use-fetch";
import { createIssue } from "@/actions/issues";
import { getOrganizationUsers } from "@/actions/organization";
import { issueSchema } from "@/app/lib/validators";
import { X } from "lucide-react";
import { IssueType, ProjectType, SprintType } from "@/lib/types";
import { useRouter } from "next/navigation";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sprintId: SprintType["id"] | null;
  status: IssueType["status"] | null;
  projectId: ProjectType["id"];
  onIssueCreated: () => void;
  orgId: ProjectType["organizationId"];
};

export default function IssueCreationDrawer({
  isOpen,
  onClose,
  sprintId,
  status,
  projectId,
  onIssueCreated,
  orgId,
}: Props) {
  const router = useRouter();

  const {
    loading: createIssueLoading,
    fn: createIssueFn,
    data: newIssue,
    setData: setNewIssue,
  } = useFetch<IssueType, [string, any]>(createIssue);

  const {
    fn: fetchUsers,
    data: users,
  } = useFetch(getOrganizationUsers);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: {errors}
  } = useForm({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: "",
      priority: "MEDIUM",
      description: "",
      assigneeId: "",
    },
  });

  useEffect(() => {
    if (isOpen && orgId) fetchUsers(orgId);
  }, [isOpen, orgId]);

  const unlockScreen = () => {
    document.body.style.pointerEvents = "auto";
    document.body.style.overflow = "auto";
  };

  useEffect(() => {
    if (newIssue) {
      reset();
      setNewIssue(null);
      onClose();
      onIssueCreated();
      unlockScreen();
      router.refresh();
    }
  }, [newIssue, onClose, onIssueCreated, reset, setNewIssue, router]);

  const onSubmit = (formData: any) => {
    createIssueFn(projectId, {
      ...formData,
      status: status || "TODO",
      sprintId: sprintId || null,
      description: formData.description || null,
    });
  };

  return (
    <Drawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          onClose();
          unlockScreen();
        }
      }}
    >
      <DrawerContent className="max-w-2xl mx-auto rounded-t-3xl bg-white dark:bg-gray-900 border-x border-t border-gray-200 dark:border-gray-800 shadow-2xl">
        {/* Drawer Handle */}
        <div className="absolute top-4 left-1/2 -translate-x-1/2 w-12 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />

        <DrawerHeader className="px-8 pt-10 pb-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <DrawerTitle className="text-3xl font-bold text-gray-900 dark:text-gray-100">
              Create New Issue
            </DrawerTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onClose();
                unlockScreen();
              }}
              className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5 text-gray-600 dark:text-gray-400" />
            </Button>
          </div>
        </DrawerHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="px-8 py-6 space-y-8 overflow-y-auto max-h-[70vh]">
          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Title
            </label>
            <Input
              {...register("title")}
              placeholder="Enter a clear, descriptive title"
              className="h-12 text-lg font-medium border-gray-300 dark:border-gray-700 focus:border-indigo-500 focus:ring-indigo-500 rounded-xl"
            />
            {errors.title && <p className="text-[#FF7A5C] text-[11px] font-bold mt-1 ml-1 uppercase">{errors.title.message}</p>}

          </div>

          {/* Assignee & Priority */}
          <div className="grid grid-cols-2 gap-6">
            {/* Assignee */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Assignee
              </label>
              <Controller
                name="assigneeId"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <SelectValue placeholder="Select assignee..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200 dark:border-gray-700 shadow-lg">
                      {users?.map((user) => (
                        <SelectItem key={user.id} value={user.id}>
                          <span className="font-medium">{user?.name || "Unnamed User"}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                
                />
                {errors.assigneeId && <p className="text-[#FF7A5C] text-[11px] font-bold mt-1 ml-1 uppercase">{errors.assigneeId.message}</p>}
            </div>

            {/* Priority */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Priority
              </label>
              <Controller
                name="priority"
                control={control}
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger className="h-11 rounded-xl border-gray-300 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-gray-200 dark:border-gray-700 shadow-lg">
                      {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                        <SelectItem key={p} value={p}>
                          <span
                            className={`font-medium ${
                              p === "URGENT"
                                ? "text-red-600 dark:text-red-400"
                                : p === "HIGH"
                                ? "text-orange-600"
                                : p === "MEDIUM"
                                ? "text-amber-600"
                                : "text-green-600"
                            }`}
                          >
                            {p}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Description <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <div className="rounded-xl border border-gray-300 dark:border-gray-700 overflow-hidden shadow-sm">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <MDEditor
                    value={field.value}
                    onChange={field.onChange}
                    preview="edit"
                    height={101}
                    className="border-0 bg-transparent! text-slate-700!"
                    textareaProps={{
                      placeholder: "Add a detailed description using Markdown...",
                    }}
                  />
                )}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6 pb-8">
            <Button
              type="submit"
              disabled={createIssueLoading}
              className="w-full h-12 rounded-xl text-base font-semibold bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white shadow-lg transition-all"
            >
              {createIssueLoading ? "Creating Issue..." : "Create Issue"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}