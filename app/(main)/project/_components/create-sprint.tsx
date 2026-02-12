"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Plus, Command, ArrowRight, Gauge } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, addDays } from "date-fns";
import { sprintSchema } from "@/app/lib/validators";
import useFetch from "@/hooks/use-fetch";
import { createSprint } from "@/actions/sprints";
import { ItemType, ProjectStatusType, ProjectType, SprintType } from "@/lib/types";
import { BarLoader } from "react-spinners";
import "react-day-picker/style.css";
import CreateItem from "./create-item";
import CreateStatus from "./create-status";
import { Switch } from "@/components/ui/switch";
import { z } from "zod";

type Props = {
    projectTitle: ProjectType['name'],
    projectKey: ProjectType['key'],
    projectId: ProjectType['id'],
    sprintKey: number,
    projectItems: ItemType[],
    projectStages: ProjectStatusType[],
}

// Derive type directly from schema to fix the "Resolver" mismatch error
type SprintFormValues = z.infer<typeof sprintSchema>;

export default function CreateSprint({
    projectTitle,
    projectKey,
    sprintKey: initialSprintKey,
    projectId,
    projectItems,
    projectStages
}: Props) {
    const [open, setOpen] = useState(false);
    const [currentSprintKey, setCurrentSprintKey] = useState(initialSprintKey);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(),
        to: addDays(new Date(), 14),
    });

    const router = useRouter();
    const { loading: createSprintLoading, fn: createSprintFn, data: createdSprint } = useFetch<SprintType, [string, SprintFormValues]>(createSprint);

    const {
        register,
        control,
        handleSubmit,
        reset,
        watch,
        formState: { errors },
    } = useForm<SprintFormValues>({
        resolver: zodResolver(sprintSchema),
        defaultValues: {
            name: `${projectKey}-${currentSprintKey}`,
            startDate: dateRange.from,
            endDate: dateRange.to,
            isLongSprint: false,
        },
    });

    const isLongSprint = watch("isLongSprint");

    useEffect(() => {
        reset({
            name: `${projectKey}-${currentSprintKey}`,
            startDate: dateRange.from,
            endDate: dateRange.to,
            isLongSprint: false,
        });
    }, [currentSprintKey, reset, projectKey]);

    const onSubmit = async (data: SprintFormValues) => {
        // If it's a long sprint, you might want to normalize dates before sending to DB
        const payload = {
            ...data,
            // Optional: send nulls or far-future dates if Long Sprint is active
            startDate: data.isLongSprint ? new Date() : data.startDate,
            endDate: data.isLongSprint ? addDays(new Date(), 3650) : data.endDate,
        };
        await createSprintFn(projectId, payload);
    };

    useEffect(() => {
        if (createdSprint) {
            setCurrentSprintKey((prev) => prev + 1);
            setOpen(false);
            router.refresh();
        }
    }, [createdSprint, router]);

    return (
        <div className="w-full">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-10 pb-6 border-b border-[#F2F0EB] gap-6">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white border border-[#F2F0EB] rounded-2xl flex items-center justify-center shadow-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-amber-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Gauge size={24} className="text-[#FF7A5C] relative z-10" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h1 className="text-[32px] font-bold text-[#1D1D1F] tracking-tighter leading-none mb-2">
                            {projectTitle}
                        </h1>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-[#FF7A5C] uppercase tracking-widest bg-[#FFF0EA] px-2 py-0.5 rounded">
                                {projectKey}
                            </span>
                            <span className="text-[10px] font-bold text-[#86868B] uppercase tracking-widest">
                                Active_Workspace
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-center gap-3 w-full lg:w-auto flex-wrap">
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button className="h-12 px-6 rounded-xl font-bold text-[13px] transition-all active:scale-95 flex items-center gap-2 bg-[#1D1D1F] text-white hover:bg-black shadow-lg shadow-black/5">
                                <Plus size={16} strokeWidth={3} /> New Sprint
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-120 bg-white/70 backdrop-blur-2xl border border-white/20 rounded-[32px] shadow-2xl p-0 overflow-hidden outline-none">
                            <div className="absolute inset-0 bg-linear-to-br from-amber-500/5 to-transparent pointer-events-none" />
                            
                            {createSprintLoading && (
                                <div className="absolute inset-x-0 top-0 z-50">
                                    <BarLoader width={"100%"} color="#FF7A5C" height={4} />
                                </div>
                            )}

                            <DialogHeader className="p-8 pb-0">
                                <DialogTitle className="flex items-center gap-2">
                                    <Command size={14} className="text-[#FF7A5C]" />
                                    <span className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.2em]">Initialize New Sprint</span>
                                </DialogTitle>
                            </DialogHeader>

                            <form onSubmit={handleSubmit(onSubmit)} className={`p-8 pt-6 space-y-6 transition-opacity ${createSprintLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-[#86868B] uppercase tracking-widest ml-1">Sprint Identifier</label>
                                    <Input
                                        id="name"
                                        {...register("name")}
                                        className="h-14 bg-white/50 border-[#F2F0EB] rounded-2xl font-mono text-[14px] font-bold text-[#1D1D1F] focus-visible:ring-2 focus-visible:ring-[#FF7A5C]/20"
                                    />
                                    {errors.name && <p className="text-[#FF7A5C] text-[10px] font-bold uppercase mt-1 ml-1">{errors.name.message as string}</p>}
                                </div>

                                <div className="flex items-center justify-between p-5 bg-white/40 border border-[#F2F0EB] rounded-2xl backdrop-blur-md">
                                    <div className="flex flex-col">
                                        <label className="text-[10px] font-black text-[#1D1D1F] uppercase tracking-widest">Long Sprint Profile</label>
                                        <span className="text-[11px] text-[#86868B] font-medium">Bypass temporal constraints</span>
                                    </div>
                                    <Controller
                                        control={control}
                                        name="isLongSprint"
                                        render={({ field }) => (
                                            <Switch
                                                checked={field.value}
                                                onCheckedChange={field.onChange}
                                                className="data-[state=checked]:bg-[#FF7A5C]"
                                            />
                                        )}
                                    />
                                </div>

                                {!isLongSprint && (
                                    <div className="space-y-2 animate-in fade-in zoom-in-95 duration-300">
                                        <label className="text-[10px] font-black text-[#86868B] uppercase tracking-widest ml-1">Duration Profile</label>
                                        <Controller
                                            control={control}
                                            name="startDate"
                                            render={() => (
                                                <Popover>
                                                    <PopoverTrigger asChild>
                                                        <Button variant="outline" className="h-14 w-full bg-white/50 border-[#F2F0EB] rounded-2xl justify-between px-4 font-bold text-[13px]">
                                                            <span className="flex items-center gap-2">
                                                                <CalendarIcon size={14} className="text-[#FF7A5C]" />
                                                                {dateRange.from && dateRange.to ? (
                                                                    `${format(dateRange.from, "MMM dd, yyyy")} — ${format(dateRange.to, "MMM dd, yyyy")}`
                                                                ) : (
                                                                    "Select Range"
                                                                )}
                                                            </span>
                                                        </Button>
                                                    </PopoverTrigger>
                                                    <PopoverContent className="w-auto p-4 bg-white/95 backdrop-blur-2xl border-white/20 rounded-[24px] shadow-2xl" align="center">
                                                        <DayPicker
                                                            classNames={{
                                                                chevron: "fill-[#FF7A5C]",
                                                                range_start: "bg-[#FF7A5C] text-white rounded-full",
                                                                range_end: "bg-[#FF7A5C] text-white rounded-full",
                                                                range_middle: "bg-[#FFF0EA] text-[#FF7A5C]",
                                                                day_button: "hover:bg-[#FAF9F6] rounded-full transition-colors",
                                                                today: "font-black text-[#FF7A5C] underline",
                                                            }}
                                                            mode="range"
                                                            disabled={[{ before: new Date() }]}
                                                            selected={dateRange}
                                                            onSelect={(range) => {
                                                                if (range?.from && range?.to) {
                                                                    setDateRange({ from: range.from, to: range.to });
                                                                    reset({
                                                                        ...control._formValues,
                                                                        startDate: range.from,
                                                                        endDate: range.to
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                            )}
                                        />
                                    </div>
                                )}

                                <Button
                                    type="submit"
                                    disabled={createSprintLoading}
                                    className="w-full h-14 bg-[#FF7A5C] hover:bg-black text-white rounded-2xl font-bold text-[13px] transition-all shadow-xl shadow-[#FF7A5C]/20 flex items-center justify-center gap-2 group"
                                >
                                    {createSprintLoading ? "Initializing Node..." : (
                                        <>
                                            Initialize Sprint
                                            <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                    
                    <CreateItem 
                        projectTitle={projectTitle} 
                        projectId={projectId} 
                        items={projectItems}
                    />

                    <CreateStatus 
                        projectTitle={projectTitle}
                        projectId={projectId}
                        stages={projectStages}
                    />
                </div>
            </div>
        </div>
    );
}