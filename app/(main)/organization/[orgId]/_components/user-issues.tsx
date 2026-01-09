// _components/user-issues.jsx
import { getUserIssues } from "@/actions/organization";
import IssueCard from "@/components/issue-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Suspense } from "react";
import { Inbox, Send, LayoutGrid, Loader2 } from "lucide-react";
import { IssueType, ProjectType, UserType } from "@/lib/types";

type Props={
    userId: UserType['id']
}

type IssuesWithProjectAndUser = IssueType & {
    project: ProjectType;
    assignee: UserType | null;
    reporter: UserType;
}
const UserIssues = async ({ userId }:Props) => {
    const issuesdata = await getUserIssues(userId);
    
    if (issuesdata.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-[#FAF9F6]/50 rounded-[40px] border border-dashed border-[#F2F0EB]">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                    <Inbox className="text-[#86868B]" size={20} />
                </div>
                <p className="text-[13px] font-bold text-[#86868B] uppercase tracking-widest">Queue_Clear</p>
            </div>
        );
    }

    const assignedIssues = issuesdata.filter(
        (issue) => issue.assignee?.clerkId === userId
    );
    
    const reportedIssues = issuesdata.filter(
        (issue) => issue.reporter.clerkId === userId
    );

    return (
        <div className="space-y-10">
            <Tabs defaultValue="assigned" className="w-full">
                {/* 1. APPLE-STYLE SEGMENTED CONTROL */}
                <div className="flex items-center justify-between mb-8">
                <TabsList className="
        flex 
        w-full 
        max-w-max 
        sm:w-auto 
        items-center 
        justify-start 
        overflow-x-auto 
        overflow-y-hidden 
        scrollbar-hide 
        bg-white/10 
        backdrop-blur-2xl 
        border border-white/20 
        p-1.5 
        rounded-full 
        h-auto 
        shadow-[0_8px_32px_0_rgba(31,38,135,0.07)]
      ">
        <TabsTrigger 
          value="assigned" 
          className="
            shrink-0 
            px-4 
            sm:px-8 
            py-2.5 
            rounded-full 
            text-[13px] 
            font-bold 
            tracking-tight 
            text-[#1D1D1F]/70 
            data-[state=active]:bg-white/90 
            data-[state=active]:text-[#1D1D1F] 
            data-[state=active]:shadow-[0_0_15px_rgba(255,122,92,0.3)] 
            transition-all 
            flex 
            items-center 
            gap-2
          "
        >
          <Inbox size={14} className="text-[#FF7A5C]" />
          <span className="whitespace-nowrap">Assigned Directives</span>
          <span className="
            ml-1 
            px-2 
            py-0.5 
            bg-[#FF7A5C] 
            text-white 
            text-[10px] 
            rounded-full 
            animate-pulse-slow
          ">
            {assignedIssues.length}
          </span>
        </TabsTrigger>

        <TabsTrigger 
          value="reported" 
          className="
            shrink-0 
            px-4 
            sm:px-8 
            py-2.5 
            rounded-full 
            text-[13px] 
            font-bold 
            tracking-tight 
            text-[#1D1D1F]/70 
            data-[state=active]:bg-white/90 
            data-[state=active]:text-[#1D1D1F] 
            data-[state=active]:shadow-lg 
            transition-all 
            flex 
            items-center 
            gap-2
          "
        >
          <Send size={14} />
          <span className="whitespace-nowrap">Issued by You</span>
        </TabsTrigger>
      </TabsList>

                    <div className="hidden md:flex items-center gap-2 text-[#86868B]">
                        <LayoutGrid size={16} />
                        <span className="text-[11px] font-black uppercase tracking-widest">View_Grid_Optimized</span>
                    </div>
                </div>

                {/* 2. TABS CONTENT WITH MOTION FADE */}
                <TabsContent value="assigned" className="mt-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Suspense fallback={<GridSkeleton />}>
                        <IssueGrid issues={assignedIssues} />
                    </Suspense>
                </TabsContent>

                <TabsContent value="reported" className="mt-0 focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Suspense fallback={<GridSkeleton />}>
                        <IssueGrid issues={reportedIssues} />
                    </Suspense>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function IssueGrid({ issues }:{issues: IssuesWithProjectAndUser[]}) {
    if (issues.length === 0) {
        return (
            <div className="py-12 text-center bg-white border border-[#F2F0EB] rounded-[32px]">
                <p className="text-[13px] font-bold text-[#86868B] uppercase tracking-tighter">No items found in this category.</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {issues.map((issue) => (
                <IssueCard key={issue.id} issue={issue} showStatus />
            ))}
        </div>
    );
}

function GridSkeleton() {
    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-10">
            {[1, 2, 3].map((i) => (
                <div key={i} className="h-48 bg-white border border-[#F2F0EB] rounded-[24px] flex items-center justify-center animate-pulse">
                    <Loader2 className="text-[#FF7A5C] animate-spin" size={24} />
                </div>
            ))}
        </div>
    );
}

export default UserIssues;