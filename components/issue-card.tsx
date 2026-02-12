"use client";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import IssueDetailsDialog from "./issue-details-dialog";
import UserAvatar from "./user-avatar";
import { useRouter } from "next/navigation";
import { DetailedIssue, Priority, ProjectStatusType, UserType } from "@/lib/types"; // Ensure Priority is exported from your types

// 1. Define the config with a specific Record type to satisfy indexing
const priorityConfig: Record<Priority, { borderColor: string }> = {
  LOW: { borderColor: "border-[#28CD41]" },
  MEDIUM: { borderColor: "border-[#FFCC00]" },
  HIGH: { borderColor: "border-[#FF9500]" },
  URGENT: { borderColor: "border-[#FF3B30]" },
};


// 2. Explicitly define the Props interface
interface IssueCardProps {
  issue: DetailedIssue;
  showStatus?: boolean;
  onDelete?: () => void;
  onUpdate?: (updated: DetailedIssue) => void;
  statuses: ProjectStatusType[];
  orgUsers: UserType[];
}

export default function IssueCard({ 
  issue, 
  showStatus = false, 
  onDelete = () => { }, 
  onUpdate = () => { } ,
  statuses,
  orgUsers
}: IssueCardProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const router = useRouter();
  
  // 3. This now works because priorityConfig is typed to accept Priority keys
  const config = priorityConfig[issue.priority];

  return (
    <>
      <div 
        onClick={() => setIsDialogOpen(true)} 
        className={`group relative flex flex-col p-5 bg-white/40 backdrop-blur-[30px] border border-[#1D1D1F]/10 ${config.borderColor} ${!issue.item.isMainProduct ? 'border-r-[6px]' : 'border-2'} rounded-[24px] transition-all duration-300 hover:bg-white/60 hover:-translate-y-1 active:scale-[0.97] cursor-pointer overflow-hidden ${issue.item.isMainProduct && 'border-red-600 border-dotted'} animate-in fade-in slide-in-from-bottom-2 duration-700`}
      >
        <div className="relative z-10 flex flex-col">
          <div className="flex justify-between items-start mb-1">
            <h3 className="text-[16px] font-semibold text-[#1D1D1F] tracking-tight leading-tight max-w-[70%]">
              {issue.item.name}
            </h3>
            <span className="text-sm font-medium text-[#1D1D1F]/60 tabular-nums">
              {Number.isInteger(issue.quantity)?issue.quantity:issue.quantity.toFixed(4)} <span className="text-[10px] uppercase text-[#1D1D1F]/40">{issue.item.itemUnit}</span>
            </span>
            {issue.status.key=="ASSEMBLY" && <span className="text-sm font-medium text-[#1D1D1F]/60 tabular-nums">
              {issue.item.usingQuantity} <span className="text-[10px] uppercase text-[#1D1D1F]/40">{issue.item.usingUnit}</span>
            </span>}
          </div>

          {showStatus && (
            <div className="mb-1">
              <span className="inline-block text-[9px] font-bold text-[#1D1D1F]/40 uppercase tracking-widest bg-black/5 px-2 py-0.5 rounded-md">
                {issue.status.name}
              </span>
            </div>
          )}

          {/* This is the magic "Zero-Space" expansion container */}
          <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-300 ease-in-out">
            <div className="overflow-hidden">
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-black/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                <UserAvatar user={issue.assignee} />
                <time className="text-[10px] font-medium text-[#86868B]/70 tabular-nums">
                  {formatDistanceToNow(new Date(issue.createdAt), { addSuffix: true })}
                </time>
              </div>
            </div>
          </div>
        </div>

        <div className="absolute inset-0 rounded-[24px] ring-1 ring-inset ring-white/50 pointer-events-none" />
      </div>

      {isDialogOpen && (
        <IssueDetailsDialog 
          isOpen={isDialogOpen} 
          onClose={() => setIsDialogOpen(false)} 
          issue={issue} 
          statuses={statuses}
          onDelete={() => { router.refresh(); onDelete(); }} 
          onUpdate={(updated) => { router.refresh(); onUpdate(updated); }} 
          // orgUsers={orgUsers}
        />
      )}
    </>
  );
}