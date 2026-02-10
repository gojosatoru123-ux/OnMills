// app/(main)/project/[projectId]/page.jsx
import { getProject } from "@/actions/project";
import { notFound } from "next/navigation";
import CreateSprint from "../_components/create-sprint";
import SprintBoard from "../_components/sprint-board";
import { Target, Layers, Box, TicketCheck } from "lucide-react";
import { ProjectType } from "@/lib/types";
import { getProjectItems } from "@/actions/items";
import { getProjectStatus } from "@/actions/status";

type Props={
  params: Promise<{projectId:ProjectType['id']}>
}

const Project = async ({ params }:Props) => {
  const { projectId } = await params;
  const project = await getProject(projectId);
  const projectItems = await getProjectItems(projectId);
  const projectStages = await getProjectStatus(projectId);

  if (!project) {
    notFound();
  }

  // Calculate high-level stats for the Apple-style header strip
  const totalSprints = project.sprints?.length || 0;
  const activeSprints = project.sprints?.filter(s => s.status === "ACTIVE").length || 0;
  const completedSprints = project.sprints?.filter(s => s.status === "COMPLETED").length || 0;
  const totalItems =  projectItems.length || 0;

  return (
    <div className="min-h-screen bg-[#FAF9F6] overflow-x-hidden">
      <main className="max-w-400 mx-auto px-2 sm:px-8 py-10">
        
        {/* 1. PROJECT METADATA STRIP */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-10">
          {[
            { label: "Total Batches", value: totalSprints, icon: Layers, color: "text-[#FF7A5C]" },
            { label: "Batches Completed", value: completedSprints, icon: TicketCheck, color: "text-[#AF52DE]" },
            { label: "Active Nodes", value: activeSprints, icon: Target, color: "text-[#34C759]" },
            { label: "Total Items", value: totalItems, icon: Box, color: "text-[#007AFF]" },
          ].map((stat, i) => (
            <div key={i} className="bg-white border border-[#F2F0EB] p-5 rounded-[24px] flex items-center gap-4 shadow-sm">
              <div className={`p-3 rounded-2xl bg-[#FAF9F6] ${stat.color}`}>
                <stat.icon size={20} strokeWidth={2.5} />
              </div>
              <div>
                <p className="text-[10px] font-black text-[#86868B] uppercase tracking-widest leading-none mb-1">
                  {stat.label}
                </p>
                <p className="text-[18px] font-bold text-[#1D1D1F]">
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 2. CONTROL LAYER (Creation & Title) */}
        <section className="mb-12">
          <CreateSprint
            projectTitle={project.name}
            projectId={projectId}
            projectKey={project.key}
            sprintKey={totalSprints + 1}
            projectItems = {projectItems}
            projectStages = {projectStages}
          />
        </section>

        {/* NEW SECTION (Item creation) */}
        {/* <section className="mb-12">
          <CreateItem projectTitle={project.name} projectId={projectId} items = {projectItems}/>
        </section> */}

        {/* 3. OPERATIONAL LAYER (The Board) */}
        <section className="relative">
          <div className="flex items-center gap-4 mb-8">
            <h3 className="text-[14px] font-black text-[#1D1D1F] uppercase tracking-[0.3em]">
              Operational_Sprint_Board
            </h3>
            <div className="flex-1 h-px bg-[#F2F0EB]" />
          </div>
          
          <div className="bg-white border border-[#F2F0EB] rounded-[40px] p-2 shadow-2xl shadow-black/2">
             <div className="bg-[#FAF9F6]/30 rounded-[36px] overflow-hidden">
                {project.sprints.length>0 && <SprintBoard
                  sprints={project.sprints}
                  projectId={projectId}
                  orgId={project.organizationId}
                  statuses = {projectStages}
                  projectItems = {projectItems}
                />}
             </div>
          </div>
        </section>

      </main>
    </div>
  );
};

export default Project;