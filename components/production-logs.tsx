"use client"
import React, { useEffect, useState, useMemo, useCallback } from "react"
import { Productionlogs, SprintType } from "@/lib/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { 
    History, 
    Clock, 
    Loader2,
    Database,
    ArrowUp,
    ArrowDown,
    Activity,
    Box,
    RefreshCw
} from "lucide-react"
import { format, isValid } from "date-fns"
import { Button } from "@/components/ui/button"
import { getProductionLogs } from "@/actions/assembly"

// Simple in-memory cache to prevent re-fetching on tab switch
const LOGS_CACHE: Record<string, Productionlogs[]> = {};

type SortOrder = "asc" | "desc" | null;

const ProductionLogs = ({ sprintId }: { sprintId: SprintType['id'] }) => {
    const [logs, setLogs] = useState<Productionlogs[]>(LOGS_CACHE[sprintId] || []);
    const [loading, setLoading] = useState(!LOGS_CACHE[sprintId]);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [sortOrder, setSortOrder] = useState<SortOrder>("desc");

    const fetchLogs = useCallback(async (isSilent = false) => {
        if (!isSilent) setLoading(true);
        else setIsRefreshing(true);
        
        try {
            const data = await getProductionLogs(sprintId);
            const typedData = data as any;
            LOGS_CACHE[sprintId] = typedData;
            setLogs(typedData);
        } catch (err) {
            console.error("Log Fetch Error:", err);
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [sprintId]);

    useEffect(() => {
        // Only fetch if we don't have cached data
        if (!LOGS_CACHE[sprintId]) {
            fetchLogs();
        }
    }, [sprintId, fetchLogs]);

    const sortedLogs = useMemo(() => {
        if (!sortOrder) return logs;
        return [...logs].sort((a, b) => {
            const dateA = a.producedAt ? new Date(a.producedAt).getTime() : 0;
            const dateB = b.producedAt ? new Date(b.producedAt).getTime() : 0;
            return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
        });
    }, [logs, sortOrder]);

    const toggleSort = () => setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));

    const formatLogDate = (dateValue: any) => {
        const date = new Date(dateValue);
        if (!dateValue || !isValid(date)) return "Unknown Date";
        return {
            day: format(date, "MMM d, yyyy"),
            time: format(date, "HH:mm:ss")
        };
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24">
                <div className="relative">
                    <div className="absolute inset-0 blur-2xl bg-amber-400/30 animate-pulse rounded-full" />
                    <Loader2 className="w-10 h-10 animate-spin text-amber-500 relative z-10" />
                </div>
                <p className="mt-4 text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase">Calibrating Optics</p>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-700">
            {/* Glassmorphism Header */}
            <div className="group relative overflow-hidden rounded-[2.5rem] p-px bg-linear-to-br from-white/60 via-white/20 to-transparent">
                <div className="relative flex items-center justify-between px-8 py-5 rounded-[2.5rem] bg-white/40 backdrop-blur-3xl border border-white/40 shadow-2xl">
                    <div className="flex items-center gap-4">
                        <div className="relative p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 overflow-hidden">
                            <History className={`w-5 h-5 text-amber-600 transition-transform duration-1000 ${isRefreshing ? 'rotate-180' : ''}`} />
                            {isRefreshing && (
                                <div className="absolute inset-0 bg-amber-500/10 animate-pulse" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                                Production Ledger
                                {isRefreshing && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.15em]">Live Telemetry</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => fetchLogs(true)}
                            className="h-10 w-10 rounded-xl bg-white/40 hover:bg-white/80 border border-white/60 transition-all"
                            disabled={isRefreshing}
                        >
                            <RefreshCw className={`w-4 h-4 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button 
                            variant="ghost" 
                            onClick={toggleSort}
                            className="h-10 px-4 rounded-xl bg-white/40 hover:bg-white/80 border border-white/60 shadow-sm transition-all active:scale-95"
                        >
                            {sortOrder === "asc" ? <ArrowUp className="w-3.5 h-3.5 text-amber-600" /> : <ArrowDown className="w-3.5 h-3.5 text-amber-600" />}
                        </Button>
                        <Badge className="h-10 px-4 rounded-xl bg-slate-900 text-white border-none shadow-lg">
                            {logs.length}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Timeline Feed */}
            <ScrollArea className="h-125 pr-4">
                {sortedLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white/20 rounded-[3rem] border-2 border-dashed border-white/40">
                        <Database className="w-12 h-12 mb-4 text-slate-200" />
                        <p className="text-slate-400 font-bold tracking-tight italic opacity-60">No activity recorded</p>
                    </div>
                ) : (
                    <div className="relative ml-4 space-y-4 pb-10">
                        {/* The Vertical Rail */}
                        <div className="absolute left-6 top-0 bottom-0 w-px bg-linear-to-b from-amber-500/50 via-slate-200 to-transparent" />

                        {sortedLogs.map((log, index) => {
                            const dateInfo = formatLogDate(log.producedAt);
                            const isPositive = log.quantityProduced > 0;

                            return (
                                <div 
                                    key={log.id} 
                                    className="relative flex items-center gap-6 group"
                                    style={{ animationDelay: `${index * 40}ms` }}
                                >
                                    {/* Node */}
                                    <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-full border-4 border-white bg-white/90 shadow-xl backdrop-blur-md group-hover:scale-110 transition-transform">
                                        <div className={`w-3 h-3 rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    </div>

                                    {/* Glass Card */}
                                    <div className="flex-1 flex items-center justify-between p-5 rounded-[2rem] border border-white/80 bg-white/40 backdrop-blur-xl shadow-xl hover:shadow-amber-500/10 hover:border-amber-200/60 transition-all cursor-default">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2 text-slate-400">
                                                <Clock className="w-3 h-3" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">
                                                    {typeof dateInfo === 'string' ? dateInfo : dateInfo.day}
                                                </span>
                                            </div>
                                            <div className="text-sm font-black text-slate-700">
                                                {typeof dateInfo === 'string' ? '' : dateInfo.time}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <div className={`text-2xl font-black tracking-tighter leading-none ${isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                                                    {isPositive ? `+${log.quantityProduced}` : log.quantityProduced}
                                                </div>
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Units</div>
                                            </div>
                                            <div className={`p-3 rounded-2xl ${isPositive ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'} border border-current/10`}>
                                                {isPositive ? <Box className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </ScrollArea>
        </div>
    );
};

export default ProductionLogs;