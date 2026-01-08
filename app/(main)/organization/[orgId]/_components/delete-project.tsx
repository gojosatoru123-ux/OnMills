"use client";

import { useEffect } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { useOrganization } from "@clerk/nextjs";
import { deleteProject } from "@/actions/project";
import { useRouter } from "next/navigation";
import useFetch from "@/hooks/use-fetch";
import { ProjectType } from "@/lib/types";

type Props={
  projectId: ProjectType['id']
}
export default function DeleteProject({ projectId }:Props) {
  const { membership } = useOrganization();
  const router = useRouter();

  const {
    loading: isDeleting,
    error,
    fn: deleteProjectFn,
    data: deleted,
  } = useFetch(deleteProject);

  const isAdmin = membership?.role === "org:admin";

  const handleDelete = async (e: React.MouseEvent) => {
    // Prevent navigation if this button is inside a Link/Card
    e.preventDefault();
    e.stopPropagation();

    if (window.confirm("Are you sure you want to delete this project? This action cannot be undone.")) {
      deleteProjectFn(projectId);
    }
  };

  useEffect(() => {
    if (deleted) {
      router.refresh();
    }
  }, [deleted, router]);

  if (!isAdmin) return null;

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        onClick={handleDelete}
        disabled={isDeleting}
        className={`
          group relative flex items-center justify-center 
          w-9 h-9 rounded-full transition-all duration-300
          ${isDeleting 
            ? "bg-gray-100 cursor-not-allowed" 
            : "bg-white border border-[#F2F0EB] hover:border-red-100 hover:bg-red-50"
          }
        `}
        aria-label="Delete Project"
      >
        {isDeleting ? (
          <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
        ) : (
          <Trash2 
            className="h-4 w-4 text-gray-400 group-hover:text-red-500 transition-colors" 
            strokeWidth={2}
          />
        )}

        {/* Apple-style Tooltip on Hover (Optional) */}
        <span className="absolute -top-8 scale-0 group-hover:scale-100 transition-all duration-200 bg-[#1D1D1F] text-white text-[10px] font-bold px-2 py-1 rounded-md pointer-events-none whitespace-nowrap">
          Delete Node
        </span>
      </button>

      {error && (
        <span className="text-[10px] font-bold text-red-500 uppercase tracking-tighter animate-in fade-in slide-in-from-right-1">
          {"Error deleting"}
        </span>
      )}
    </div>
  );
}