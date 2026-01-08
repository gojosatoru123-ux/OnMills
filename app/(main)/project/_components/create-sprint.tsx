"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { CalendarIcon, Plus, X, Command, Calendar, ArrowRight, Gauge } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, addDays } from "date-fns";
import { sprintSchema } from "@/app/lib/validators";
import useFetch from "@/hooks/use-fetch";
import { createSprint } from "@/actions/sprints";
import { ProjectType, SprintType } from "@/lib/types";
import { BarLoader } from "react-spinners"; // Added BarLoader
import "react-day-picker/style.css";

type Props = {
    projectTitle: ProjectType['name'],
    projectKey: ProjectType['key'],
    projectId: ProjectType['id'],
    sprintKey: number,
}

type SprintFormValues = {
    name: string;
    startDate: Date;
    endDate: Date;
};

export default function CreateSprint({
    projectTitle,
    projectKey,
    sprintKey: initialSprintKey,
    projectId,
}: Props) {
    const [showForm, setShowForm] = useState(false);
    const [currentSprintKey, setCurrentSprintKey] = useState(initialSprintKey);
    const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
        from: new Date(),
        to: addDays(new Date(), 14),
    });

    const router = useRouter();
    // Added SprintType generic to match your project schema
    const { loading: createSprintLoading, fn: createSprintFn, data: createdSprint } = useFetch<SprintType, [string, SprintFormValues]>(createSprint);

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<SprintFormValues>({
        resolver: zodResolver(sprintSchema),
        defaultValues: {
            name: `${projectKey}-${currentSprintKey}`,
            startDate: dateRange.from,
            endDate: dateRange.to,
        },
    });

    useEffect(() => {
        reset({
            name: `${projectKey}-${currentSprintKey}`,
            startDate: dateRange.from,
            endDate: dateRange.to,
        });
    }, [currentSprintKey, reset, projectKey]);

    const onSubmit = async (data: SprintFormValues) => {
        await createSprintFn(projectId, data);
    };

    useEffect(() => {
        if (createdSprint) {
            setCurrentSprintKey((prev) => prev + 1);
            setShowForm(false);
            router.refresh();
        }
    }, [createdSprint, router]);

    return (
        <div className="w-full">
            {/* 1. Header Command Strip */}
            <div className="flex items-center justify-between mb-10 pb-6 border-b border-[#F2F0EB]">
                <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-white border border-[#F2F0EB] rounded-2xl flex items-center justify-center shadow-sm">
                        <Gauge size={24} className="text-[#FF7A5C]" strokeWidth={1.5} />
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

                <Button
                    onClick={() => setShowForm(!showForm)}
                    className={`h-12 px-6 rounded-xl font-bold text-[13px] transition-all active:scale-95 flex items-center gap-2 ${
                        !showForm ? "bg-[#1D1D1F] text-white hover:bg-black" : "bg-white border border-[#F2F0EB] text-[#FF7A5C]"
                    }`}
                >
                    {!showForm ? (
                        <> <Plus size={16} strokeWidth={3} /> New Sprint </>
                    ) : (
                        <> <X size={16} strokeWidth={3} /> Close </>
                    )}
                </Button>
            </div>

            {/* 2. Elevated Form Container with BarLoader */}
            {showForm && (
                <div className="bg-[#FAF9F6]/50 backdrop-blur-md border border-[#F2F0EB] rounded-[32px] p-2 mb-10 animate-in fade-in slide-in-from-top-4 duration-500 overflow-hidden relative">
                    
                    {/* SYSTEM LOADER OVERLAY */}
                    {createSprintLoading && (
                        <div className="absolute inset-x-0 top-0 z-50">
                            <BarLoader width={"100%"} color="#FF7A5C" height={4} />
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit(onSubmit)}
                        className={`bg-white border border-[#F2F0EB] rounded-[28px] p-8 flex flex-col lg:flex-row items-center gap-6 shadow-sm transition-opacity ${createSprintLoading ? 'opacity-50 pointer-events-none' : 'opacity-100'}`}
                    >
                        <div className="w-full lg:w-1/3 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Command size={12} className="text-[#FF7A5C]" />
                                <span className="text-[10px] font-black text-[#86868B] uppercase tracking-widest">Sprint Identifier</span>
                            </div>
                            <Input
                                id="name"
                                {...register("name")}
                                className="h-12 bg-white border-[#F2F0EB] rounded-xl font-mono text-[13px] font-bold text-[#1D1D1F] focus-visible:ring-1 focus-visible:ring-[#FF7A5C]/30"
                            />
                        </div>

                        <div className="hidden lg:block h-10 w-px bg-[#F2F0EB]" />

                        <div className="w-full lg:w-1/3 space-y-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Calendar size={12} className="text-[#FF7A5C]" />
                                <span className="text-[10px] font-black text-[#86868B] uppercase tracking-widest">Duration Profile</span>
                            </div>
                            <Controller
                                control={control}
                                name="startDate"
                                render={() => (
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className="h-12 w-full bg-white border-[#F2F0EB] rounded-xl justify-between px-4 font-bold text-[13px]">
                                                <span className="flex items-center gap-2">
                                                    {dateRange.from && dateRange.to ? (
                                                        `${format(dateRange.from, "MMM dd")} — ${format(dateRange.to, "MMM dd")}`
                                                    ) : (
                                                        "Select Range"
                                                    )}
                                                </span>
                                                <CalendarIcon size={14} className="text-[#FF7A5C]" />
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-4 bg-white/90 backdrop-blur-2xl border-white/20 rounded-[24px] shadow-2xl" align="start">
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

                        <div className="w-full lg:flex-1 pt-4 lg:pt-0">
                            <Button
                                type="submit"
                                disabled={createSprintLoading}
                                className="w-full h-14 bg-[#FF7A5C] hover:bg-black text-white rounded-xl font-bold text-[13px] transition-all shadow-lg shadow-[#FF7A5C]/15 flex items-center justify-center gap-2 group"
                            >
                                {createSprintLoading ? "Initializing Node..." : (
                                    <>
                                        Initialize Sprint
                                        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                    {errors.name && <p className="text-red-500 text-[10px] font-bold uppercase mt-2 ml-4 tracking-tighter">{errors.name.message}</p>}
                </div>
            )}
        </div>
    );
}