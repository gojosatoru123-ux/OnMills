"use client";
import { statusSchema } from "@/app/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription } from "@/components/ui/item";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import useFetch from "@/hooks/use-fetch";
import { ItemType, ProjectStatusType } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Command, Plus, RefreshCcw, Trash, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { BarLoader } from "react-spinners";
import { useOrganization } from "@clerk/nextjs";
import { createProjectStatus, deleteProjectStatus } from "@/actions/status";
import { ScrollArea } from "@/components/ui/scroll-area";

type CreateStatusProps = {
    projectTitle: string;
    projectId: string;
    stages: ProjectStatusType[];
}
type StatusFormData = {
    name: string;
    order: number;
}

const CreateStatus = ({ projectTitle, projectId, stages }: CreateStatusProps) => {
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const router = useRouter();
    const { loading: createStatusLoading, fn: createStatusFn, data: createdStatus } = useFetch(createProjectStatus);

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm({
        resolver: zodResolver(statusSchema)
    });

    const {
        loading: deleteStatusLoading,
        error: deleteStatusError,
        fn: deleteStatusFn,
        data: deleted,
    } = useFetch(deleteProjectStatus);
    const { organization, membership } = useOrganization();

    const canChange = membership?.role === "org:admin"


    const handleDelete = async () => {
        if (deleteId) {
            deleteStatusFn(deleteId, projectId);
        }
        setDeleteOpen(false);
        setDeleteId(null);
        router.refresh();
    };

    const onSubmit = async (data: StatusFormData) => {
        await createStatusFn(projectId, data.name, data.order);
    };

    useEffect(() => {
        if (createdStatus) {
            setOpen(false);
            reset();
            router.refresh();
        }
    }, [createdStatus, router, reset]);

    return (
        <>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        className="h-12 px-6 rounded-xl font-bold text-[13px] transition-all active:scale-95 flex items-center gap-2 bg-[#1D1D1F] text-white hover:bg-black"
                    >
                        <Plus size={16} strokeWidth={3} /> Add Stage
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-125 bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-2xl p-0 overflow-hidden outline-none">
                    <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent pointer-events-none" />
                    {createStatusLoading && (
                        <div className="absolute inset-x-0 top-0 z-50">
                            <BarLoader width={"100%"} color="#FF7A5C" height={4} />
                        </div>
                    )}
                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Command size={14} className="text-[#FF7A5C]" />
                            <span className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.2em]">New Stage Entry</span>
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className={`p-8 pt-6 space-y-6 transition-opacity ${createStatusLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#1D1D1F] ml-1">STAGE NAME</label>
                            <Input
                                id="name"
                                {...register("name")}
                                placeholder="Enter stage identifier..."
                                className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-mono text-[14px] font-bold text-[#1D1D1F] focus-visible:ring-2 focus-visible:ring-[#FF7A5C]/20 focus-visible:border-[#FF7A5C]"
                            />
                            {errors.name && (
                                <p className="text-[#FF7A5C] text-[11px] font-bold mt-2 ml-1 uppercase tracking-tighter">
                                    {errors.name.message as string}
                                </p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#1D1D1F] ml-1">Order</label>
                            <Input
                                id="reorderValue"
                                {...register("order", { valueAsNumber: true })}
                                type="number"
                                placeholder="order"
                                className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-mono text-[14px] font-bold text-[#1D1D1F] focus-visible:ring-2 focus-visible:ring-[#FF7A5C]/20 focus-visible:border-[#FF7A5C]"
                            />
                            {errors.order && (
                                <p className="text-[#FF7A5C] text-[11px] font-bold mt-2 ml-1 uppercase tracking-tighter">
                                    {errors.order.message as string}
                                </p>
                            )}
                        </div>
                        <Button
                            type="submit"
                            disabled={createStatusLoading}
                            className="w-full h-14 bg-[#FF7A5C] hover:bg-black text-white rounded-2xl font-bold text-[13px] transition-all shadow-xl shadow-[#FF7A5C]/20 flex items-center justify-center gap-2 group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {createStatusLoading ? "Synchronizing..." : (
                                    <>
                                        Create Project Stage
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-12 rounded-xl border-[#F2F0EB] font-bold text-[13px] hover:bg-[#FAF9F6]">
                        Show Stages
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-80 bg-white border border-[#F2F0EB] rounded-2xl shadow-xl" align="end" sideOffset={10}>
                    <ScrollArea className="max-h-72 w-full p-2 overflow-y-auto">
                        {(deleteStatusLoading) && (
                            <BarLoader width={"100%"} color="#36d7b7" />
                        )}
                        <div className="space-y-2">
                            {stages.length === 0 && <p className="text-center text-[11px] font-bold text-[#86868B] py-4">NO STAGES FOUND</p>}
                            {stages.map((item) => (
                                <Item key={item.id} className="group border-[#F2F0EB] hover:border-[#FF7A5C]/30 transition-colors">
                                    <ItemContent>
                                        <ItemDescription className="font-mono text-[12px] font-bold text-[#1D1D1F]">{item.name}</ItemDescription>
                                        {(item.name != "TODO" && item.name != "PURCHASE" && item.name != "STORE" && item.name != "SALES") && <ItemDescription>order <span className="font-mono text-[12px] font-bold text-[#1D1D1F]">{item.order}</span></ItemDescription>}
                                    </ItemContent>
                                    <ItemActions>
                                        {item.name != "TODO" && item.name != "PURCHASE" && item.name != "STORE" && item.name != "SALES" && canChange && <Button disabled={deleteStatusLoading} onClick={() => { setDeleteId(item.id); setDeleteOpen(true); }} variant="ghost" size="icon" className="h-8 w-8 text-[#86868B] hover:text-red-500 hover:bg-red-50 transition-colors">
                                            <Trash size={14} />
                                        </Button>}
                                    </ItemActions>
                                </Item>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>

            {/* Simple Confirmation Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <p>Are you sure you want to delete this stage?</p>
                    <p>Deleting this DELETE all processed items in this stage.</p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => { setDeleteOpen(false); setDeleteId(null); }}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={deleteStatusLoading}>
                            {deleteStatusLoading ? "Deleting..." : "Delete"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default CreateStatus;