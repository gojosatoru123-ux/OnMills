"use client";
import { createItem, deleteItem } from "@/actions/items";
import { itemSchema } from "@/app/lib/validators";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Item, ItemActions, ItemContent, ItemDescription } from "@/components/ui/item";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import useFetch from "@/hooks/use-fetch";
import { ItemType } from "@/lib/types";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Command, Plus, Trash } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { BarLoader } from "react-spinners";
import { useOrganization } from "@clerk/nextjs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

type CreateItemProps = {
    projectTitle: string;
    projectId: string;
    items: ItemType[];
}

type ItemFormData = {
    name: string;
    reorderValue: number;
    itemUnit: ItemType['itemUnit'];
    usingQuantity: number;
    usingUnit: ItemType['usingUnit'];
}

const CreateItem = ({ projectId, items }: CreateItemProps) => {
    const [open, setOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const router = useRouter();

    const { loading: createItemLoading, fn: createItemFn, data: createdItem } = useFetch(createItem);
    const { loading: deleteItemLoading, fn: deleteItemFn } = useFetch(deleteItem);
    const { membership } = useOrganization();
    const canChange = membership?.role === "org:admin";

    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema)
    });

    const handleDelete = async () => {
        if (deleteId) {
            await deleteItemFn(deleteId, projectId);
            setDeleteOpen(false);
            setDeleteId(null);
            router.refresh();
        }
    };

    const onSubmit = async (data: ItemFormData) => {
        // Updated to pass all decimal and unit values
        await createItemFn(projectId, data.name, data.reorderValue, data.itemUnit, data.usingQuantity, data.usingUnit);
    };

    useEffect(() => {
        if (createdItem) {
            setOpen(false);
            reset();
            router.refresh();
        }
    }, [createdItem, router, reset]);

    const UNIT_OPTIONS = ["PIECES", "UNITS", "SETS", "PACKETS", "KILOGRAM", "GRAM", "TONNE", "LITRES", "METERS", "FEET", "INCHES", "SQUARE_METERS", "CUBIC_METERS"];

    return (
        <div className="flex gap-3">
            {/* Preserved Original Add Item Button Design */}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                    <Button
                        className="h-12 px-6 rounded-xl font-bold text-[13px] transition-all active:scale-95 flex items-center gap-2 bg-[#1D1D1F] text-white hover:bg-black"
                    >
                        <Plus size={16} strokeWidth={3} /> Add Item
                    </Button>
                </DialogTrigger>

                {/* Vision Pro Glassmorphism Popup Form */}
                <DialogContent className="sm:max-w-125 bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-2xl p-0 overflow-hidden outline-none">
                    {/* Subtle Amber Glow & Floating Geometry */}
                    <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent pointer-events-none" />
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-200/20 blur-3xl rounded-full pointer-events-none" />

                    {createItemLoading && (
                        <div className="absolute inset-x-0 top-0 z-50">
                            <BarLoader width={"100%"} color="#FF7A5C" height={4} />
                        </div>
                    )}

                    <DialogHeader className="p-8 pb-0">
                        <DialogTitle className="flex items-center gap-2">
                            <Command size={14} className="text-[#FF7A5C]" />
                            <span className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.2em]">New Item Entry</span>
                        </DialogTitle>
                    </DialogHeader>

                    <form onSubmit={handleSubmit(onSubmit)} className={`p-8 pt-6 space-y-6 transition-opacity ${createItemLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>

                        {/* Transparent Lens Filter Bar Style Input */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-bold text-[#1D1D1F] ml-1 uppercase">Item Name</label>
                            <Input
                                {...register("name")}
                                placeholder="Enter item identifier..."
                                className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-mono text-[14px] font-bold text-[#1D1D1F] focus-visible:ring-2 focus-visible:ring-[#FF7A5C]/20 focus-visible:border-[#FF7A5C]"
                            />
                            {errors.name && <p className="text-[#FF7A5C] text-[11px] font-bold mt-2 ml-1">{errors.name.message as string}</p>}
                        </div>

                        {/* Decimal Field: Reorder Value & Unit Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[#1D1D1F] ml-1 uppercase">Reorder Point</label>
                                <Input
                                    {...register("reorderValue", { valueAsNumber: true })}
                                    type="number"
                                    step="any"
                                    placeholder="0.00"
                                    className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-mono text-[14px] font-bold text-[#1D1D1F]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[#1D1D1F] ml-1 uppercase">Unit</label>
                                <Controller
                                    name="itemUnit"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-bold text-[13px]">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/90 backdrop-blur-xl border-white/20 rounded-2xl shadow-xl">
                                                {UNIT_OPTIONS.map((u) => (
                                                    <SelectItem key={u} value={u} className="font-bold text-[12px]">{u}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        {/* Decimal Field: Usage Quantity & Unit Selection */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[#1D1D1F] ml-1 uppercase">Usage Qty</label>
                                <Input
                                    {...register("usingQuantity", { valueAsNumber: true })}
                                    type="number"
                                    step="any"
                                    placeholder="0.00"
                                    className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-mono text-[14px] font-bold text-[#1D1D1F]"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-bold text-[#1D1D1F] ml-1 uppercase">Usage Unit</label>
                                <Controller
                                    name="usingUnit"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <SelectTrigger className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-bold text-[13px]">
                                                <SelectValue placeholder="Select" />
                                            </SelectTrigger>
                                            <SelectContent className="bg-white/90 backdrop-blur-xl border-white/20 rounded-2xl shadow-xl">
                                                {UNIT_OPTIONS.map((u) => (
                                                    <SelectItem key={u} value={u} className="font-bold text-[12px]">{u}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        <Button
                            type="submit"
                            disabled={createItemLoading}
                            className="w-full h-14 bg-[#FF7A5C] hover:bg-black text-white rounded-2xl font-bold text-[13px] transition-all shadow-xl shadow-[#FF7A5C]/20 flex items-center justify-center gap-2 group relative overflow-hidden"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                {createItemLoading ? "Synchronizing..." : (
                                    <>
                                        Create Project Item
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </span>
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Show Items Popover with Glassmorphism */}
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" className="h-12 rounded-xl border-[#F2F0EB] font-bold text-[13px] hover:bg-[#FAF9F6]">
                        Show Items
                    </Button>
                </PopoverTrigger>
                <PopoverContent side="top" className="w-80 bg-white/80 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-xl p-2" align="end">
                    <ScrollArea className="max-h-72 w-full p-2 overflow-y-auto">
                        <div className="space-y-1">
                            {items.length === 0 && <p className="text-center text-[11px] font-bold text-[#86868B] py-4 uppercase">No Items</p>}
                            {items.map((item) => (
                                <Item key={item.id} className="group border-[#F2F0EB] bg-white/40 hover:bg-white transition-all rounded-xl">
                                    <ItemContent>
                                        <ItemDescription className="font-mono text-[12px] font-bold text-[#1D1D1F]">{item.name}</ItemDescription>
                                        <ItemDescription className="text-[10px]">
                                            Min: <span className="font-mono text-[#FF7A5C]">{item.reorderValue.toFixed(2)}</span> <span className="font-mono text-[#FF7A5C]">{item.itemUnit}</span>
                                        </ItemDescription>
                                        <ItemDescription className="text-[10px]">
                                            Using quantity: <span className="font-mono text-[#FF7A5C]">{item.usingQuantity.toFixed(2)}</span> <span className="font-mono text-[#FF7A5C]">{item.usingUnit}</span>
                                        </ItemDescription>
                                    </ItemContent>
                                    <ItemActions>
                                        {canChange && (
                                            <Button
                                                onClick={() => { setDeleteId(item.id); setDeleteOpen(true); }}
                                                variant="ghost" size="icon" className="h-8 w-8 text-[#86868B] hover:text-red-500"
                                            >
                                                <Trash size={14} />
                                            </Button>
                                        )}
                                    </ItemActions>
                                </Item>
                            ))}
                        </div>
                    </ScrollArea>
                </PopoverContent>
            </Popover>

            {/* Simple Delete Dialog */}
            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="bg-white/90 backdrop-blur-2xl rounded-[32px] border-white/20">
                    <DialogHeader>
                        <DialogTitle className="text-[#1D1D1F]">Confirm Deletion</DialogTitle>
                    </DialogHeader>
                    <p className="text-[13px] text-[#86868B]">Deleting this will remove all related processing batches.</p>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setDeleteOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} className="rounded-xl">Delete</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default CreateItem;