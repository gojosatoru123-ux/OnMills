"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { X, Search, Sliders, Download } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DetailedIssue, UserType } from "@/lib/types";

interface BoardFiltersProps {
  issues: DetailedIssue[];
  onFilterChange: (filteredIssues: DetailedIssue[]) => void;
}

const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default function BoardFilters({ issues, onFilterChange }: BoardFiltersProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>([]);
  const [selectedPriority, setSelectedPriority] = useState<string>("all");

  // Filter logic memoized to prevent infinite loops
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      const matchesSearch = issue.item.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesAssignee =
        selectedAssignees.length === 0 ||
        (issue.assignee && selectedAssignees.includes(issue.assignee.id));
      const matchesPriority =
        selectedPriority === "all" || issue.priority === selectedPriority;
      return matchesSearch && matchesAssignee && matchesPriority;
    });
  }, [issues, searchTerm, selectedAssignees, selectedPriority]);

  const lastEmittedIds = useRef("");

  // Sync with parent component
  useEffect(() => {
    const currentIds = filteredIssues.map((i) => i.id).join(",");
    if (lastEmittedIds.current !== currentIds) {
      lastEmittedIds.current = currentIds;
      onFilterChange(filteredIssues);
    }
  }, [filteredIssues, onFilterChange]);

  const assignees = useMemo(
    () =>
      issues
        .map((issue) => issue.assignee)
        .filter(
          (item, index, self): item is UserType =>
            item !== null && index === self.findIndex((t) => t?.id === item.id)
        ),
    [issues]
  );

  const toggleAssignee = (id: string) =>
    setSelectedAssignees((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedAssignees([]);
    setSelectedPriority("all");
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).replace(",", "");
  };

  const exportToCSV = () => {
    const headers = [
      "Item Name",
      "Item Reorder Value",
      "Description",
      "Status",
      "Priority",
      "Quantity",
      "Unit",
      "Assignee Name",
      "Assignee Email",
      "Reporter Name",
      "Is Split",
      "Process Track",
      "Created At",
      "Updated At",
    ];

    const csvRows = filteredIssues.map((issue) => {
      return [
        `"${issue.item?.name || ""}"`,
        issue.item?.reorderValue || 0,
        `"${issue.description?.replace(/"/g, '""') || ""}"`,
        issue.status.name,
        issue.priority,
        issue.quantity,
        issue.item.itemUnit,
        issue.assignee?.name || "Unassigned",
        issue.assignee?.email || "N/A",
        issue.reporter?.name || "N/A",
        issue.isSplit ? "Yes" : "No",
        `"${issue.track?.join(" -> ") || ""}"`,
        formatDate(issue.createdAt), // Formatted date
        formatDate(issue.updatedAt), // Formatted date
      ];
    });

    const csvContent =
      "data:text/csv;charset=utf-8,\uFEFF" + 
      [headers, ...csvRows].map((e) => e.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Sprint${issues[0].sprintId}_${new Date().toLocaleDateString().replace(/\//g, '-')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-full py-6">
      {/* Floating Geometry Glow */}
      <div className="absolute -top-6 left-1/4 w-1/2 h-24 bg-[#FF7A5C]/10 blur-[80px] rounded-full pointer-events-none" />
      
      <div className="relative flex flex-col lg:flex-row items-center gap-6 p-2 bg-white/20 backdrop-blur-3xl border border-white/30 rounded-[30px] shadow-sm">
        {/* Transparent Lens Search Bar */}
        <div className="relative w-full lg:w-80">
          <Search size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-[#86868B]" />
          <Input
            className="w-full h-12 pl-12 bg-white/40 border-none rounded-2xl font-bold shadow-inner placeholder:text-[#86868B]/50"
            placeholder="Search item name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Assignee Avatars */}
        <div className="flex items-center gap-4 px-3 h-12 bg-white/10 rounded-2xl border border-white/10">
          <div className="flex -space-x-3 hover:-space-x-1 transition-all duration-300">
            {assignees.map((assignee) => (
              <button
                key={assignee.id}
                onClick={() => toggleAssignee(assignee.id)}
                className={`relative transition-transform ${
                  selectedAssignees.includes(assignee.id) ? "z-20 scale-110" : "hover:scale-105"
                }`}
              >
                <div
                  className={`p-[1.5px] rounded-full ${
                    selectedAssignees.includes(assignee.id) ? "bg-[#FF7A5C]" : "bg-white/40"
                  }`}
                >
                  <Avatar className="h-8 w-8 border border-white/10 rounded-full">
                    <AvatarImage src={assignee.profileImageUrl || ""} />
                    <AvatarFallback className="bg-white font-black text-[10px]">
                      {assignee.name?.[0]}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Priority Selection */}
          <Select value={selectedPriority} onValueChange={setSelectedPriority}>
            <SelectTrigger className="h-12 w-48 bg-white/40 border-none rounded-2xl px-5 font-black text-[12px]">
              <Sliders size={14} className="text-[#FF7A5C] mr-2" />
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl bg-white/90 backdrop-blur-xl">
              <SelectItem value="all" className="rounded-xl font-bold">All Priorities</SelectItem>
              {priorities.map((p) => (
                <SelectItem key={p} value={p} className="rounded-xl font-bold">{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Export Full Button */}
          <Button
            variant="ghost"
            onClick={exportToCSV}
            className="h-12 px-5 rounded-2xl bg-white/40 border border-white/20 hover:bg-white/60 flex items-center gap-2 transition-all"
          >
            <Download size={14} className="text-[#1D1D1F]" strokeWidth={2.5} />
            <span className="text-[10px] font-black uppercase tracking-widest text-[#1D1D1F]">
              Export Full
            </span>
          </Button>

          {/* Clear Button */}
          {(searchTerm || selectedAssignees.length > 0 || selectedPriority !== "all") && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="h-12 px-5 rounded-2xl bg-[#1D1D1F] text-white hover:bg-black flex items-center gap-2"
            >
              <X size={14} strokeWidth={3} />
              <span className="text-[10px] font-black uppercase tracking-widest">Clear</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}