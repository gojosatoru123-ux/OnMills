"use client";

import { useEffect, useState } from "react";
import { useOrganization, useUser } from "@clerk/nextjs";
import OrgSwitcher from "@/components/org-switcher";
import { useForm } from "react-hook-form";
import { projectSchema } from "@/app/lib/validators";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import useFetch from "@/hooks/use-fetch";
import { createProject } from "@/actions/project";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles, Hash, FileText, Layout } from "lucide-react";
import Link from "next/link";

const CreateProjectPage = () => {
  const { isLoaded: isOrgLoaded, membership } = useOrganization();
  const { isLoaded: isUserLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(projectSchema) });

  const { loading, error, data: project, fn: createProjectFn } = useFetch(createProject);

  useEffect(() => {
    if (isOrgLoaded && isUserLoaded && membership) {
      setIsAdmin(membership.role === "org:admin");
    }
  }, [isOrgLoaded, isUserLoaded, membership]);

  useEffect(() => {
    if (project) router.push(`/project/${project.id}`);
  }, [project, router]);

  if (!isOrgLoaded || !isUserLoaded) return null;

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white border border-[#F2F0EB] p-10 rounded-[40px] text-center shadow-sm">
          <div className="w-16 h-16 bg-[#FFF0EA] rounded-3xl flex items-center justify-center mx-auto mb-6">
            <Layout className="text-[#FF7A5C]" size={28} />
          </div>
          <h2 className="text-[22px] font-bold text-[#1D1D1F]">Elevated Access Required</h2>
          <p className="text-[#86868B] mt-2 mb-8 text-[15px]">Only administrators can initialize new project nodes.</p>
          <div className="flex justify-center">
            <OrgSwitcher />
          </div>
        </div>
      </div>
    );
  }

  const onSubmit = async (data) => {
    await createProjectFn(data);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col">
      {/* 2. Main Form Container */}
      <main className="flex-1 flex items-center justify-center px-6 pb-20">
        <div className="max-w-140 w-full">
          <div className="mb-10 text-center">
            <h1 className="text-[40px] font-bold tracking-tighter text-[#1D1D1F] leading-tight">
              Initialize <br /> <span className="text-[#FF7A5C]">New Project Node</span>
            </h1>
            <p className="text-[#86868B] mt-4 font-medium">Define the core parameters for your operational workspace.</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 bg-white p-10 rounded-[40px] border border-[#F2F0EB] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.03)]">
            
            {/* Project Name Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#86868B] ml-1">Project Name</label>
              <div className="relative">
                <Input 
                  id="name" 
                  {...register("name")}
                  className="h-14 bg-[#FAF9F6] border-none rounded-2xl px-5 text-[15px] font-semibold focus-visible:ring-2 focus-visible:ring-[#FF7A5C]/20 transition-all placeholder:text-gray-300"
                  placeholder="Ex: Sapphire Logistics"
                />
              </div>
              {errors.name && <p className="text-[#FF7A5C] text-[11px] font-bold mt-1 ml-1 uppercase">{errors.name.message}</p>}
            </div>

            {/* Project Key Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#86868B] ml-1">Terminal Key</label>
              <div className="relative flex items-center">
                <Hash className="absolute left-5 text-[#FF7A5C]" size={16} />
                <Input
                  id="key"
                  {...register("key")}
                  className="h-14 bg-[#FAF9F6] border-none rounded-2xl pl-12 pr-5 text-[15px] font-mono font-bold uppercase focus-visible:ring-2 focus-visible:ring-[#FF7A5C]/20 transition-all placeholder:text-gray-300"
                  placeholder="EX: PROJ"
                />
              </div>
              {errors.key && <p className="text-[#FF7A5C] text-[11px] font-bold mt-1 ml-1 uppercase">{errors.key.message}</p>}
            </div>

            {/* Description Input */}
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-widest text-[#86868B] ml-1">Description</label>
              <Textarea
                id="description"
                {...register("description")}
                className="min-h-30 bg-[#FAF9F6] border-none rounded-2xl p-5 text-[15px] font-medium resize-none focus-visible:ring-2 focus-visible:ring-[#FF7A5C]/20 transition-all placeholder:text-gray-300"
                placeholder="What is the primary objective of this node?"
              />
              {errors.description && <p className="text-[#FF7A5C] text-[11px] font-bold mt-1 ml-1 uppercase">{errors.description.message}</p>}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-16 bg-[#1D1D1F] hover:bg-black text-white rounded-[22px] text-[16px] font-bold shadow-xl shadow-black/10 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>Synchronizing...</span>
                </>
              ) : (
                <>
                  <Sparkles size={20} className="text-[#FF7A5C]" />
                  <span>Finalize & Create</span>
                </>
              )}
            </Button>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 rounded-2xl">
                <p className="text-red-500 text-[12px] font-bold text-center uppercase tracking-tight">Error creating. Try different key</p>
              </div>
            )}
          </form>
        </div>
      </main>
    </div>
  );
};

export default CreateProjectPage;