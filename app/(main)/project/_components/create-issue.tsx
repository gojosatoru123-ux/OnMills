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
import { X, ClipboardList, Info, User, Zap } from "lucide-react";
import { IssueType, ProjectType, SprintType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { getProjectItems } from "@/actions/items";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  sprintId: SprintType["id"] | null;
  status: IssueType["statusId"] | null;
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

  const { fn: fetchUsers, data: users } = useFetch(getOrganizationUsers);
  const { fn: fetchItems, data: items } = useFetch(getProjectItems);

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(issueSchema),
    defaultValues: {
      title: "",
      priority: "MEDIUM",
      description: "",
      assigneeId: "",
      quantity: 1,
    },
  });

  useEffect(() => {
    if (isOpen && orgId) {
      fetchUsers(orgId);
      fetchItems(projectId);
    }
  }, [isOpen, orgId, projectId]);

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
      status: status,
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
      <DrawerContent className="max-w-2xl mx-auto bg-slate-50 border-t border-slate-200 shadow-2xl rounded-t-[2rem]">

        <DrawerHeader >

          <div className="flex justify-between">
            <DrawerTitle className="text-xl font-bold text-slate-900 tracking-tight">
              New
            </DrawerTitle>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onClose();
                unlockScreen();
              }}
              className="rounded-full hover:bg-slate-100"
            >
              <X className="h-5 w-5 text-slate-500" />
            </Button>
          </div>

        </DrawerHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="px-8 py-2 overflow-y-auto max-h-[75vh]"
        >
          {/* Section: Primary Details */}
          <div className="space-y-2 pt-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Info className="h-3 w-3" /> Core Information
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2  gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Item Catalog</label>
                <Controller
                  name="title"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all">
                        <SelectValue placeholder="Search or select item..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl shadow-xl border-slate-200">
                        {items?.map((item) => (
                          <SelectItem key={item.id} value={item.id} className="py-2">
                            <span className="font-medium text-slate-700">{item?.name}</span>
                            <span className="ml-2 text-xs px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded uppercase font-bold">
                              {item?.itemUnit}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {errors.title && (
                  <p className="text-rose-500 text-[11px] font-bold mt-1 ml-1 uppercase">{errors.title.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Qty</label>
                <Input
                  id="quantity"
                  {...register("quantity", { valueAsNumber: true })}
                  type="number"
                  className="h-11 bg-white border-slate-200 shadow-sm rounded-xl focus:ring-2 focus:ring-slate-900/5 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Section: Workflow */}
          <div className="space-y-4 pt-2">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Zap className="h-3 w-3" /> Workflow & Assignment
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 opacity-50" /> Assignee
                </label>
                <Controller
                  name="assigneeId"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm rounded-xl">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {users?.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user?.name || "Unnamed User"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  />
                  {errors.assigneeId && (
                    <p className="text-rose-500 text-[11px] font-bold mt-1 ml-1 uppercase">{errors.assigneeId.message}</p>
                  )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Priority Level</label>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                      <SelectTrigger className="h-11 bg-white border-slate-200 shadow-sm rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl border-slate-200">
                        {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
                          <SelectItem key={p} value={p}>
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${p === 'URGENT' ? 'bg-rose-500' :
                                p === 'HIGH' ? 'bg-orange-500' :
                                  p === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'
                                }`} />
                              <span className="font-medium text-slate-700">{p}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </div>

          {/* Section: Description */}
          <div className="space-y-2 pt-2">
            <label className="text-sm font-semibold text-slate-700">
              Description <span className="text-slate-400 font-normal">(Markdown supported)</span>
            </label>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm focus-within:ring-2 focus-within:ring-slate-900/5 transition-all">
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <MDEditor
                    value={field.value}
                    onChange={field.onChange}
                    preview="edit"
                    height={180}
                    className="border-none"
                    textareaProps={{
                      placeholder: "Outline the tasks, steps, or issues here...",
                    }}
                  />
                )}
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex items-center gap-3  pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onClose();
                unlockScreen();
              }}
              className="flex-1 h-12 rounded-xl text-slate-600 font-bold hover:bg-slate-200/50"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createIssueLoading}
              className="flex-2 h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold shadow-lg shadow-slate-900/10 transition-all disabled:opacity-50"
            >
              {createIssueLoading ? "Processing..." : "Create Issue"}
            </Button>
          </div>
        </form>
      </DrawerContent>
    </Drawer>
  );
}