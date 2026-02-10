"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarLoader } from "react-spinners";
import { formatDistanceToNow, isAfter, isBefore, format } from "date-fns";
import useFetch from "@/hooks/use-fetch";
import { useRouter } from "next/navigation";
import { updateSprintStatus } from "@/actions/sprints";
import { Calendar, Play, Square, Timer, AlertCircle, CircleDot, CheckCircle2, CalendarDays } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// Updated Interface based on your requirements
export interface SprintType { 
  id: string; 
  name: string; 
  startDate: Date; 
  endDate: Date; 
  status: 'PLANNED' | 'ACTIVE' | 'COMPLETED'; 
  projectId: string; 
  isLongSprint: boolean; // New field
  createdAt: Date; 
  updatedAt: Date; 
}

interface SprintManagerProps {
  sprint: SprintType;
  setSprint: (sprint: SprintType) => void;
  sprints: SprintType[];
  projectId: string;
}

export default function SprintManager({
  sprint,
  setSprint,
  sprints,
  projectId,
}: SprintManagerProps) {
  const [status, setStatus] = useState<SprintType['status']>(sprint.status);
  const router = useRouter();

  const {
    fn: updateStatus,
    loading,
    error,
    data: updatedStatus,
  } = useFetch<{ success: boolean; sprint: SprintType }, [string, SprintType['status']]>(updateSprintStatus);

  const startDate = new Date(sprint.startDate);
  const endDate = new Date(sprint.endDate);
  const now = new Date();

  // Logic: Can only end if it's NOT a long sprint
  const canStart = isBefore(now, endDate) && isAfter(now, startDate) && status === "PLANNED";
  const canEnd = status === "ACTIVE" && !sprint.isLongSprint;

  const handleStatusChange = async (newStatus: SprintType['status']) => {
    updateStatus(sprint.id, newStatus);
  };

  useEffect(() => {
    if (updatedStatus && updatedStatus.success) {
      setStatus(updatedStatus.sprint.status);
      setSprint(updatedStatus.sprint);
    }
  }, [updatedStatus, loading, setSprint]);

  const getStatusDisplay = () => {
    if (status === "COMPLETED") return { text: "Cycle Concluded", icon: <Square size={12} />, class: "bg-gray-100 text-gray-500" };
    
    // Logic: Due dates and Overdue only show if NOT a long sprint
    if (!sprint.isLongSprint) {
      if (status === "ACTIVE" && isAfter(now, endDate)) return { text: `Overdue: ${formatDistanceToNow(endDate)}`, icon: <AlertCircle size={12} />, class: "bg-red-50 text-red-600 border border-red-100" };
      if (status === "PLANNED" && isBefore(now, startDate)) return { text: `T-Minus ${formatDistanceToNow(startDate)}`, icon: <Timer size={12} />, class: "bg-[#FFF0EA] text-[#FF7A5C] border border-[#FFD8C7]" };
    } else if (status === "ACTIVE") {
        return { text: "Infinite Stream Active", icon: <CircleDot size={12} className="animate-pulse" />, class: "bg-blue-50 text-blue-600 border border-blue-100" };
    }

    if (status === "ACTIVE") return { text: "Node Live", icon: <Play size={12} />, class: "bg-green-50 text-green-600 border border-green-100" };
    return null;
  };

  const statusInfo = getStatusDisplay();

  const handleSprintChange = (value: string) => {
    const selectedSprint = sprints.find((s) => s.id === value);
    if (selectedSprint) {
      setSprint(selectedSprint);
      setStatus(selectedSprint.status);
      router.replace(`/project/${projectId}`, { scroll: false });
    }
  };

  return (
    <div className="bg-white/40 backdrop-blur-2xl border border-white/20 rounded-[32px] p-6 shadow-sm">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">

        {/* 1. SPRINT SELECTOR */}
        <div className="flex flex-col gap-2 w-full md:w-auto">
          <label className="text-[10px] font-black text-[#86868B] uppercase tracking-[0.2em] ml-1">Select Active Batch</label>
          <Select value={sprint.id} onValueChange={handleSprintChange}>
            <SelectTrigger className="h-14 bg-white/60 border-none rounded-2xl w-full md:w-[320px] px-5 font-bold text-[15px] focus:ring-2 focus:ring-[#FF7A5C]/10 transition-all shadow-inner">
              <div className="flex items-center gap-3">
                <Calendar size={18} className="text-[#FF7A5C]" />
                <SelectValue placeholder="Select Sprint" />
              </div>
            </SelectTrigger>
            <SelectContent className="rounded-3xl border border-white/30 bg-white/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] p-1.5 overflow-hidden max-h-100">
              {sprints.map((s) => {
                const statusConfig = {
                  ACTIVE: {
                    bg: "bg-[#FF7A5C]/20",
                    text: "text-[#FF7A5C]",
                    icon: <CircleDot className="w-3 h-3 animate-pulse" />,
                    glow: "shadow-[0_0_12px_rgba(255,122,92,0.3)]",
                  },
                  COMPLETED: {
                    bg: "bg-emerald-500/10",
                    text: "text-emerald-600/80",
                    icon: <CheckCircle2 className="w-3 h-3" />,
                    glow: "",
                  },
                  PLANNED: {
                    bg: "bg-blue-500/10",
                    text: "text-blue-600/80",
                    icon: <CalendarDays className="w-3 h-3" />,
                    glow: "",
                  },
                };

                const currentStatus = statusConfig[s.status];

                return (
                  <SelectItem
                    key={s.id}
                    value={s.id}
                    className="group relative rounded-2xl py-3 px-4 mb-1 transition-all duration-200 ease-out hover:bg-white/50 data-selected:bg-white/60 focus:bg-white/60 outline-none cursor-pointer border border-transparent hover:border-white/20"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                           <span className="text-[14px] font-bold text-[#1D1D1F] tracking-tight group-hover:translate-x-0.5 transition-transform duration-200">
                            {s.name}
                          </span>
                          {s.isLongSprint && (
                             <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-blue-200 text-blue-500 bg-blue-50/50">PERPETUAL</Badge>
                          )}
                        </div>

                        <div className="flex items-center gap-2 text-[11px] font-medium text-[#86868B]">
                          <span className="opacity-90">
                            {format(new Date(s.startDate), "MMM d")}
                          </span>
                          <span className="w-1.5 h-px bg-[#86868B]/30" />
                          <span className="opacity-90">
                            {s.isLongSprint ? "No Expiry" : format(new Date(s.endDate), "MMM d, yyyy")}
                          </span>
                        </div>
                      </div>

                      <Badge className={`
                        flex items-center gap-1.5 px-2.5 py-1 rounded-full border-none text-[10px] font-bold tracking-wide uppercase
                        ${currentStatus.bg} ${currentStatus.text} ${currentStatus.glow}
                        transition-all duration-300
                      `}>
                        {currentStatus.icon}
                        {s.status}
                      </Badge>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        {/* 2. DYNAMIC STATUS & ACTIONS */}
        <div className="flex items-center gap-4 w-full md:w-auto">
          {statusInfo && (
            <div className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-[12px] font-bold uppercase tracking-tight ${statusInfo.class}`}>
              {statusInfo.icon}
              {statusInfo.text}
            </div>
          )}

          <div className="h-8 w-px bg-[#F2F0EB] hidden md:block" />

          {canStart && (
            <Button
              onClick={() => handleStatusChange("ACTIVE")}
              disabled={loading}
              className="h-12 px-8 bg-[#34C759] hover:bg-[#2ead4d] text-white rounded-xl font-bold text-[13px] shadow-lg shadow-green-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Play size={16} fill="currentColor" />
              Start Deployment
            </Button>
          )}

          {canEnd && (
            <Button
              onClick={() => handleStatusChange("COMPLETED")}
              disabled={loading}
              className="h-12 px-6 rounded-xl font-bold text-[13px] transition-all active:scale-95 flex items-center gap-2 bg-[#1D1D1F] text-white hover:bg-black"
              >
              <Square size={14} fill="currentColor" />
              End Operation
            </Button>
          )}

          {status === "ACTIVE" && sprint.isLongSprint && (
            <div className="text-[10px] text-[#86868B] font-bold uppercase tracking-widest px-4 border border-dashed border-[#86868B]/30 py-2.5 rounded-xl">
              Perpetual Node
            </div>
          )}
        </div>
      </div>

      {/* 3. SYSTEM FEEDBACK LAYER */}
      {loading && (
        <div className="mt-6 rounded-full overflow-hidden">
          <BarLoader width={"100%"} color="#FF7A5C" height={3} />
        </div>
      )}

      {error && (
        <p className="mt-4 text-center text-red-500 text-[11px] font-bold uppercase tracking-widest bg-red-50 py-2 rounded-lg border border-red-100">
          System Error: {error instanceof Error ? "Error Occured" : "Protocol Failure"}
        </p>
      )}
    </div>
  );
}